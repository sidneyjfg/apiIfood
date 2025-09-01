// services/inventoryService.ts
import { Transaction, Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Product } from '../database/models/products';
import { InventoryReservation } from '../database/models/inventoryReservation';
import { updateIfoodStock } from './ifoodStockService';

type Channel = 'IFOOD' | 'PDV' | 'MANUAL';
type ReservationState = 'ACTIVE' | 'CANCELLED' | 'CONSUMED';

export async function getOnHandAndActiveReserved(productId: string | number) {
  const product = await Product.findByPk(productId as any, { attributes: ['id', 'product_id', 'on_hand'] });
  if (!product) throw new Error(`Product ${productId} não encontrado`);

  const key = product.product_id ?? product.id;
  const activeReserved = await InventoryReservation.sum('qty', {
    where: { product_id: String(key), state: 'ACTIVE' },
  }) as number | null;

  return {
    onHand: product.on_hand ?? 0,
    activeReserved: activeReserved ?? 0,
    product,
    productKey: String(key),
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
  const { onHand, activeReserved, productKey } = await getOnHandAndActiveReserved(product.id);
  // Próximo available após reservar:
  const nextAvailable = computeAvailable(onHand, activeReserved + qty);

  // 2) Transação: cria/garante reserva ACTIVE (idempotente) e publica ao iFood
  return await sequelize.transaction(async (t: Transaction) => {
    // idempotência: se já existe ACTIVE igual, não duplica
    const [res, created] = await InventoryReservation.findOrCreate({
      where: { channel, order_id: orderId, item_key: itemKey },
      defaults: {
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

    return true;
  });
}

/**
 * CAN → só pode cancelar se houver ACTIVE; caso contrário, não movimenta nada.
 */
export async function cancelReservation(params: {
  product: Product;
  channel: Channel;
  orderId: string;
  itemKey: string;
  qty: number; // qty esperado; validamos com a reserva
  merchantId: string;
  accessToken: string;
  ifoodProductId: string;
}) {
  const { product, channel, orderId, itemKey, qty, merchantId, accessToken, ifoodProductId } = params;
  const { onHand, activeReserved } = await getOnHandAndActiveReserved(product.id);

  // Busca reserva ACTIVE correspondente
  const res = await InventoryReservation.findOne({
    where: { channel, order_id: orderId, item_key: itemKey, state: 'ACTIVE' },
  });

  // ❗ Cancel sem reserva ativa → não mexe estoque nem publica (evita somar indevidamente)
  if (!res) {
    return { skipped: true };
  }

  // Próximo available após cancelar:
  const nextAvailable = computeAvailable(onHand, Math.max(0, activeReserved - res.qty));

  return await sequelize.transaction(async (t: Transaction) => {
    await res.update({ state: 'CANCELLED' }, { transaction: t });

    const ok = await updateIfoodStock(merchantId, ifoodProductId, nextAvailable, accessToken);
    if (!ok) throw new Error('Falha ao publicar estoque no iFood');

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

  // Carrega reserva ativa
  const res = await InventoryReservation.findOne({
    where: { channel, order_id: orderId, item_key: itemKey, state: 'ACTIVE' },
  });

  // Sem reserva ativa → não consome físico nem publica
  if (!res) {
    return { skipped: true };
  }

  // Situação atual
  const { onHand, activeReserved } = await getOnHandAndActiveReserved(product.id);

  // Após CON:
  // on_hand' = on_hand - res.qty
  // reserved' = activeReserved - res.qty
  // available' = (on_hand - res.qty) - (activeReserved - res.qty) = on_hand - activeReserved (mesmo valor)
  const nextAvailable = computeAvailable(onHand, activeReserved);

  return await sequelize.transaction(async (t: Transaction) => {
    // 1) marcar reserva consumida
    await res.update({ state: 'CONSUMED' }, { transaction: t });

    // 2) baixar físico
    product.on_hand = Math.max(0, (product.on_hand ?? 0) - res.qty);
    await product.save({ transaction: t });

    // 3) publicar available (mesmo valor, mas mantém consistência)
    const ok = await updateIfoodStock(merchantId, ifoodProductId, nextAvailable, accessToken);
    if (!ok) throw new Error('Falha ao publicar estoque no iFood');

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
  const { onHand, activeReserved } = await getOnHandAndActiveReserved(product.id);

  const nextOnHand = Math.max(0, onHand + delta);
  const nextAvailable = computeAvailable(nextOnHand, activeReserved);

  return await sequelize.transaction(async (t: Transaction) => {
    product.on_hand = nextOnHand;
    await product.save({ transaction: t });

    const ok = await updateIfoodStock(merchantId, ifoodProductId, nextAvailable, accessToken);
    if (!ok) throw new Error('Falha ao publicar estoque no iFood');

    return true;
  });
}
