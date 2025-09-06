// services/inventoryService.ts
import { Transaction } from 'sequelize';
import { sequelize } from '@config/database';
import { Product } from '@db/models/products';
import { InventoryReservation } from '@db/models/inventoryReservation';
import { updateIfoodStock } from './ifoodStockService';
import { IfoodCatalogStatusService } from '../../catalog/services/ifoodCatalogStatusService';
import { controlsIfoodStockInERP } from '@core/utils/featureFlags';
import { ErpInventoryService } from '../../merchant/services/erpStoreService';
import { ErpLocation } from '@db/models';

type Channel = 'IFOOD' | 'PDV' | 'MANUAL';

export async function getOnHandAndActiveReserved(product: Product) {
  const productKey = String((product as any).product_id ?? product);
  const activeReserved = (await InventoryReservation.sum('qty', {
    where: {
      merchant_id: product.merchant_id,
      product_id: productKey,
      state: 'ACTIVE',
    },
  })) as number | null;

  return {
    onHand: product.on_hand ?? 0,
    activeReserved: activeReserved ?? 0,
    product,
    productKey,
  };
}

export function computeAvailable(onHand: number, activeReserved: number) {
  return Math.max(0, onHand - activeReserved);
}

/**
 * PLC/CFM → cria/garante reserva ACTIVE (idempotente por channel+orderId+itemKey).
 * Quando CONTROLA_IFOOD_ESTOQUE=1, NÃO publica available/status no iFood.
 */
export async function reserveForOrder(params: {
  product: Product;
  channel: Channel;
  orderId: string;
  itemKey: string;
  qty: number;
  merchantId: string;
  accessToken: string;
  ifoodProductId: string; // id do catálogo iFood
}) {
  const { product, channel, orderId, itemKey, qty, merchantId, accessToken, ifoodProductId } = params;

  const { onHand, activeReserved, productKey } = await getOnHandAndActiveReserved(product);
  const nextAvailable = computeAvailable(onHand, activeReserved + qty);

  return await sequelize.transaction(async (t: Transaction) => {
    const [res, created] = await InventoryReservation.findOrCreate({
      where: { merchant_id: merchantId, channel, order_id: orderId, item_key: itemKey },
      defaults: {
        merchant_id: merchantId,
        product_id: productKey,
        channel,
        order_id: orderId,
        item_key: itemKey,
        qty,
        state: 'ACTIVE',
      },
      transaction: t,
    });

    if (!created && res.state === 'ACTIVE' && res.qty !== qty) {
      await res.update({ qty }, { transaction: t });
    }

    // Se ERP controla, não publica no iFood
    if (controlsIfoodStockInERP()) {
      console.log(`🔕 [ERP controla estoque] PULANDO publicação de available no iFood (reserve). merchant=${merchantId}`);

      // 🧪 TESTE ERP: simular criação de reserva (sem publicar no iFood)
      await ErpInventoryService.testReservationForIfood({
        merchantId,
        externalCode: product.external_code,
        qty,
        action: 'CREATE',
        orderId,
      });
      // Opcional: caso queira testar uma “movimentação física” nula
      // await ErpInventoryService.testAdjustOnHandForIfood({
      //   merchantId,
      //   externalCode: product.external_code,
      //   delta: 0,
      //   reason: 'TEST_RESERVE_ON_CFM',
      //   orderId,
      // });

      return true;
    }
    const ok = await updateIfoodStock(merchantId, ifoodProductId, nextAvailable, accessToken);
    if (!ok) throw new Error('Falha ao publicar estoque no iFood');

    try {
      await IfoodCatalogStatusService.ensureStatusByAvailability(
        merchantId,
        product,
        nextAvailable,
        accessToken
      );
    } catch (e: any) {
      console.warn('⚠️ ensureStatusByAvailability falhou (reserveForOrder):', e?.message || e);
    }
    return true;
  });
}

/**
 * CAN → cancela ACTIVE; se ERP controla, não publica no iFood (apenas estado da reserva).
 */
export async function cancelReservation(params: {
  product: Product;
  channel: Channel;
  orderId: string;
  itemKey: string;
  qty: number;
  merchantId: string;
  accessToken: string;
  ifoodProductId: string;
}) {
  const { product, channel, orderId, itemKey, merchantId, accessToken, ifoodProductId } = params;

  const { onHand, activeReserved } = await getOnHandAndActiveReserved(product);
  const res = await InventoryReservation.findOne({
    where: { merchant_id: merchantId, channel, order_id: orderId, item_key: itemKey, state: 'ACTIVE' },
  });

  if (!res) return { skipped: true };

  const nextAvailable = computeAvailable(onHand, Math.max(0, activeReserved - res.qty));

  return await sequelize.transaction(async (t: Transaction) => {
    await res.update({ state: 'CANCELLED' }, { transaction: t });

    if (controlsIfoodStockInERP()) {
      console.log(`🔕 [ERP controla estoque] PULANDO publicação de available no iFood (cancel). merchant=${merchantId}`);

      // 🧪 TESTE ERP: simular cancelamento da reserva
      await ErpInventoryService.testReservationForIfood({
        merchantId,
        externalCode: product.external_code,
        qty: res.qty,          // cancele exatamente o que estava reservado
        action: 'CANCEL',
        orderId,
      });

      // Opcional: devolver físico (normalmente não mexe)
      // await ErpInventoryService.testAdjustOnHandForIfood({
      //   merchantId,
      //   externalCode: product.external_code,
      //   delta: 0,
      //   reason: 'TEST_CANCEL_RESERVE_ON_CAN',
      //   orderId,
      // });

      return { skipped: false };
    }

    const ok = await updateIfoodStock(merchantId, ifoodProductId, nextAvailable, accessToken);
    if (!ok) throw new Error('Falha ao publicar estoque no iFood');

    try {
      await IfoodCatalogStatusService.ensureStatusByAvailability(
        merchantId,
        product,
        nextAvailable,
        accessToken
      );
    } catch (e: any) {
      console.warn('⚠️ ensureStatusByAvailability falhou (cancelReservation):', e?.message || e);
    }

    return { skipped: false };
  });
}

/**
 * CON → consumir a reserva (ACTIVE → CONSUMED) e baixar o físico.
 * - Flag ON: baixa físico no ERP (De→Para) e NÃO publica iFood; não mexe em products.on_hand.
 * - Flag OFF: comportamento atual (products.on_hand -= qty, publica iFood).
 */
export async function consumeReservation(params: {
  product: Product;
  channel: Channel;
  orderId: string;
  itemKey: string;
  merchantId: string;
  accessToken: string;
  ifoodProductId: string;
}) {
  const { product, channel, orderId, itemKey, merchantId, accessToken, ifoodProductId } = params;

  const res = await InventoryReservation.findOne({
    where: { merchant_id: merchantId, channel, order_id: orderId, item_key: itemKey, state: 'ACTIVE' },
  });

  if (!res) return { skipped: true };

  const { onHand, activeReserved } = await getOnHandAndActiveReserved(product);
  const nextAvailable = computeAvailable(onHand, activeReserved); // reserva vira consumo: available tende a manter

  return await sequelize.transaction(async (t: Transaction) => {
    await res.update({ state: 'CONSUMED' }, { transaction: t });

    if (controlsIfoodStockInERP()) {
      // NÃO altera products.on_hand; baixa o físico no ERP via De→Para
      const result = await ErpInventoryService.adjustOnHandByMapping({
        merchantId,
        externalCode: product.external_code,
        delta: -res.qty,
        reason: 'CONSUME_ON_CON',
        orderId,
      });

      // Log simples só com o id:
      console.log(
        `✅ Baixa física no ERP aplicada (merchant=${merchantId}, erp_location_id=${result.erp_location_id}, sku=${product.external_code}, qty=${res.qty})`
      );

      // (Opcional) Se quiser nome/código da loja, busque a instância:
      const erpLoc = await ErpLocation.findOne({ where: { id: result.erp_location_id } });
      if (erpLoc) {
        console.log(
          `🏷️ ERP Location: ${erpLoc.code ?? erpLoc.id} - ${erpLoc.name ?? ''}`.trim()
        );
      }

      return { skipped: false };
    }

    // Caminho antigo: baixa físico local e publica Ifood
    product.on_hand = Math.max(0, (product.on_hand ?? 0) - res.qty);
    await product.save({ transaction: t });

    const ok = await updateIfoodStock(merchantId, ifoodProductId, nextAvailable, accessToken);
    if (!ok) throw new Error('Falha ao publicar estoque no iFood');

    try {
      await IfoodCatalogStatusService.ensureStatusByAvailability(
        merchantId,
        product,
        nextAvailable,
        accessToken
      );
    } catch (e: any) {
      console.warn('⚠️ ensureStatusByAvailability falhou (consumeReservation):', e?.message || e);
    }

    return { skipped: false };
  });
}

/**
 * PDV venda/ajuste → Flag ON: ajusta no ERP; Flag OFF: ajusta em products e publica iFood.
 */
export async function pdvAdjustOnHand(params: {
  product: Product;
  delta: number; // negativo para venda; positivo para entrada
  merchantId: string;
  accessToken: string;
  ifoodProductId: string;
}) {
  const { product, delta, merchantId, accessToken, ifoodProductId } = params;
  const { onHand, activeReserved } = await getOnHandAndActiveReserved(product);

  if (controlsIfoodStockInERP()) {
    await ErpInventoryService.adjustOnHandByMapping({
      merchantId,
      externalCode: product.external_code,
      delta,
      reason: 'MANUAL_ADJUST',
    });
    console.log(`✅ Ajuste PDV no ERP (merchant=${merchantId}, sku=${product.external_code}, delta=${delta})`);
    return true;
  }

  const nextOnHand = Math.max(0, onHand + delta);
  const nextAvailable = computeAvailable(nextOnHand, activeReserved);

  return await sequelize.transaction(async (t: Transaction) => {
    product.on_hand = nextOnHand;
    await product.save({ transaction: t });

    const ok = await updateIfoodStock(merchantId, ifoodProductId, nextAvailable, accessToken);
    if (!ok) throw new Error('Falha ao publicar estoque no iFood');

    try {
      await IfoodCatalogStatusService.ensureStatusByAvailability(
        merchantId,
        product,
        nextAvailable,
        accessToken
      );
    } catch (e: any) {
      console.warn('⚠️ ensureStatusByAvailability falhou (pdvAdjustOnHand):', e?.message || e);
    }

    return true;
  });
}
