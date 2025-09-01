// utils/processOrderItemTransition.ts
import { Product } from '../database/models/products';
import { OrderItem } from '../database/models/orderItem';
import { getProductIdForIfood } from './getProductIdForIfood';
import { reserveForOrder, cancelReservation, consumeReservation } from '../services/inventoryService';

type EventCode = 'PLC' | 'CON' | 'CAN';

export async function processOrderItemTransition(params: {
  merchantId: string;
  orderId: string;
  itemExternalCode: string;
  itemUniqueId?: string; // melhor para itemKey; fallback externalCode
  itemQty: number;
  eventCode: EventCode;
  accessToken: string;
}) {
  const { merchantId, orderId, itemExternalCode, itemUniqueId, itemQty, eventCode, accessToken } = params;

  const product = await Product.findOne({ where: { external_code: itemExternalCode, merchant_id: merchantId } });
  if (!product) {
    console.warn(`⚠️ Product não encontrado para external_code=${itemExternalCode} (merchant=${merchantId})`);
    return;
  }

  const orderItem = await OrderItem.findOne({ where: { order_id: orderId, external_code: itemExternalCode } });
  if (!orderItem) {
    console.warn(`⚠️ OrderItem não encontrado (order=${orderId}, external=${itemExternalCode})`);
    return;
  }

  // chave idempotente da reserva (use uniqueId do item se houver)
  const itemKey = orderItem.unique_id ?? itemUniqueId ?? itemExternalCode;

  const ifoodProductId = await getProductIdForIfood(merchantId, product);
  if (!ifoodProductId) {
    console.warn(`⚠️ iFood productId não encontrado (merchant=${merchantId}, sku=${product.external_code})`);
    return;
  }

  // Transições
  if (eventCode === 'PLC') {
    console.log(`Evento ${eventCode} (Reserva) identificado`);
    await reserveForOrder({
      product,
      channel: 'IFOOD',
      orderId,
      itemKey,
      qty: itemQty,
      merchantId,
      accessToken,
      ifoodProductId,
    });

    // Estado do item para auditoria
    await orderItem.update({
      state: 'RESERVED',
      reserved_qty: (orderItem.reserved_qty ?? 0) + itemQty,
      last_event_code: 'PLC',
      last_event_at: new Date(),
    });
    return;
  }

  if (eventCode === 'CAN') {
    console.log(`Evento ${eventCode} (Cancelamento) identificado`);
    const result = await cancelReservation({
      product,
      channel: 'IFOOD',
      orderId,
      itemKey,
      qty: itemQty,
      merchantId,
      accessToken,
      ifoodProductId,
    });

    // NEW → CANCELLED (sem reserva) não mexe stock
    await orderItem.update({
      state: 'CANCELLED',
      cancelled_qty: result.skipped ? (orderItem.cancelled_qty ?? 0) : (orderItem.cancelled_qty ?? 0) + itemQty,
      last_event_code: 'CAN',
      last_event_at: new Date(),
    });
    return;
  }

  if (eventCode === 'CON') {
    console.log(`Evento ${eventCode} (Concluido) identificado`);
    const result = await consumeReservation({
      product,
      channel: 'IFOOD',
      orderId,
      itemKey,
      merchantId,
      accessToken,
      ifoodProductId,
    });
    const consumedQty = result.skipped ? 0 : ((result as any).qty ?? itemQty);
    // Sem reserva ativa, não baixa físico
    await orderItem.update({
      state: 'CONCLUDED',
      concluded_qty: (orderItem.concluded_qty ?? 0) + consumedQty,
      last_event_code: 'CON',
      last_event_at: new Date(),
    });
    return;
  }
}
