// services/inventoryService.ts
import { Transaction, Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Product } from '../database/models/products';
import { InventoryReservation } from '../database/models/inventoryReservation';
import { updateIfoodStock } from './ifoodStockService';
import { IfoodCatalogStatusService } from './ifoodCatalogStatusService';

type Channel = 'IFOOD' | 'PDV' | 'MANUAL';
type ReservationState = 'ACTIVE' | 'CANCELLED' | 'CONSUMED';

export async function getOnHandAndActiveReserved(product: Product) {
  // product já contém merchant_id; não refaça SELECT
  const productKey = String(product.product_id ?? product);

  const activeReserved = await InventoryReservation.sum('qty', {
    where: {
      merchant_id: product.merchant_id,      // <-- agora existe
      product_id: productKey,
      state: 'ACTIVE',
    },
  }) as number | null;

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
 * PLC → criar/garantir reserva ACTIVE (idempotente por channel+orderId+itemKey)
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


  // 1) Ver estado atual
  const { onHand, activeReserved, productKey } = await getOnHandAndActiveReserved(product);
  // Próximo available após reservar:
  const nextAvailable = computeAvailable(onHand, activeReserved + qty);

  // 2) Transação: cria/garante reserva ACTIVE (idempotente) e publica ao iFood
  return await sequelize.transaction(async (t: Transaction) => {
    // idempotência: se já existe ACTIVE igual, não duplica
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

    // Se já existia ACTIVE mas com qty diferente, você pode ajustar aqui (opcional)
    if (!created && res.state === 'ACTIVE' && res.qty !== qty) {
      await res.update({ qty }, { transaction: t });
    }

    // Publica available
    const ok = await updateIfoodStock(merchantId, ifoodProductId, nextAvailable, accessToken);
    if (!ok) throw new Error('Falha ao publicar estoque no iFood');
    // 🔸 ajuste de status por disponibilidade
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
 * CAN → só pode cancelar se houver ACTIVE; caso contrário, não movimenta nada.
 */
export async function cancelReservation(params: {
  product: Product;
  channel: 'IFOOD' | 'PDV' | 'MANUAL';
  orderId: string;
  itemKey: string;
  qty: number;
  merchantId: string;
  accessToken: string;
  ifoodProductId: string;
}) {
  const { product, channel, orderId, itemKey, merchantId, accessToken, ifoodProductId } = params;

  const { onHand, activeReserved } = await getOnHandAndActiveReserved(product);

  // ✅ incluir o merchantId no filtro
  const res = await InventoryReservation.findOne({
    where: { merchant_id: merchantId, channel, order_id: orderId, item_key: itemKey, state: 'ACTIVE' },
  });

  if (!res) {
    return { skipped: true };
  }

  const nextAvailable = computeAvailable(onHand, Math.max(0, activeReserved - res.qty));

  // ✅ agora existe 't' no escopo
  return await sequelize.transaction(async (t: Transaction) => {
    await res.update({ state: 'CANCELLED' }, { transaction: t });

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
 * CON → consumir a reserva (ACTIVE → CONSUMED) e baixar o físico (on_hand -= qty)
 * Observação: available tende a permanecer igual (reserva vira consumo).
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
  const nextAvailable = computeAvailable(onHand, activeReserved);

  return await sequelize.transaction(async (t: Transaction) => {
    await res.update({ state: 'CONSUMED' }, { transaction: t });
    product.on_hand = Math.max(0, (product.on_hand ?? 0) - res.qty);
    await product.save({ transaction: t });

    const ok = await updateIfoodStock(merchantId, ifoodProductId, nextAvailable, accessToken);
    if (!ok) throw new Error('Falha ao publicar estoque no iFood');

    // 🔸 ajuste de status por disponibilidade (mantém coerência)
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
 * PDV venda → baixa físico e publica available.
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

  const nextOnHand = Math.max(0, onHand + delta);
  const nextAvailable = computeAvailable(nextOnHand, activeReserved);

  return await sequelize.transaction(async (t: Transaction) => {
    product.on_hand = nextOnHand;
    await product.save({ transaction: t });

    const ok = await updateIfoodStock(merchantId, ifoodProductId, nextAvailable, accessToken);
    if (!ok) throw new Error('Falha ao publicar estoque no iFood');

    // 🔸 ajuste de status por disponibilidade
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
