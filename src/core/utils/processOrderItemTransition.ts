import { Product } from '@db/models/products';
import { OrderItem } from '@db/models/orderItem';
import { getProductIdForIfood } from './getProductIdForIfood';
import { reserveForOrder, cancelReservation, consumeReservation } from '@modules/orders/services/inventoryService';

type EventCode = 'PLC' | 'CFM' | 'PRS' | 'DSP' | 'CAN' | 'CON';

export async function processOrderItemTransition(params: {
  merchantId: string;
  orderId: string;
  itemExternalCode: string;
  itemUniqueId?: string;
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

  const orderItem = await OrderItem.findOne({
    where: { merchant_id: merchantId, order_id: orderId, external_code: itemExternalCode }
  });
  if (!orderItem) {
    console.warn(`⚠️ OrderItem não encontrado (merchant=${merchantId}, order=${orderId}, external=${itemExternalCode})`);
    return;
  }

  const itemKey = orderItem.unique_id ?? itemUniqueId ?? itemExternalCode;

  // Apenas eventos que mexem em estoque precisam do productId do iFood
  const needsIfoodProductId = eventCode === 'CFM' || eventCode === 'CAN' || eventCode === 'CON';
  const ifoodProductId = needsIfoodProductId ? await getProductIdForIfood(merchantId, product) : null;
  if (needsIfoodProductId && !ifoodProductId) {
    console.warn(`⚠️ iFood productId não encontrado (merchant=${merchantId}, sku=${product.external_code})`);
    return;
  }

  switch (eventCode) {
    case 'PLC': {
      // 📌 NÃO reserva aqui. Só audita item.
      await orderItem.update({
        // mantém estado 'NEW'
        last_event_code: 'PLC',
        last_event_at: new Date(),
      });
      return;
    }

    case 'CFM': {
      // ✅ RESERVA idempotente no CONFIRMED
      await reserveForOrder({
        product,
        channel: 'IFOOD',
        orderId,
        itemKey,
        qty: itemQty,
        merchantId,
        accessToken,
        ifoodProductId: ifoodProductId!,
      });

      await orderItem.update({
        state: 'RESERVED',
        reserved_qty: (orderItem.reserved_qty ?? 0) + itemQty,
        last_event_code: 'CFM',
        last_event_at: new Date(),
      });
      return;
    }

    case 'CAN': {
      const result = await cancelReservation({
        product,
        channel: 'IFOOD',
        orderId,
        itemKey,
        qty: itemQty,
        merchantId,
        accessToken,
        ifoodProductId: ifoodProductId!,
      });

      await orderItem.update({
        state: 'CANCELLED',
        cancelled_qty: result.skipped ? (orderItem.cancelled_qty ?? 0) : (orderItem.cancelled_qty ?? 0) + itemQty,
        last_event_code: 'CAN',
        last_event_at: new Date(),
      });
      return;
    }

    case 'CON': {
      const result = await consumeReservation({
        product,
        channel: 'IFOOD',
        orderId,
        itemKey,
        merchantId,
        accessToken,
        ifoodProductId: ifoodProductId!,
      });

      const consumedQty = result.skipped ? 0 : ((result as any).qty ?? itemQty);
      await orderItem.update({
        state: 'CONCLUDED',
        concluded_qty: (orderItem.concluded_qty ?? 0) + consumedQty,
        last_event_code: 'CON',
        last_event_at: new Date(),
      });
      return;
    }

    case 'PRS': { // PREPARATION_STARTED
      await orderItem.update({ last_event_code: 'PRS', last_event_at: new Date() });
      return;
    }

    case 'DSP': { // DISPATCHED
      await orderItem.update({ last_event_code: 'DSP', last_event_at: new Date() });
      return;
    }
  }
}
