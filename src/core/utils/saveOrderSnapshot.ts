// utils/saveOrderSnapshot.ts
import { mergeConfig } from 'axios';
import { Order } from '@db/models/order';
import { OrderItem } from '@db/models/orderItem';

/**
 * Persiste/atualiza o pedido e seus itens (snapshot) a partir do payload do iFood.
 * Não movimenta estoque; apenas guarda dados para auditoria/rastreamento.
 */
export async function saveOrderSnapshot(merchantId: string, orderPayload: any) {
  const o = orderPayload ?? {};
  const orderId = o.id ?? o.orderId; // alguns payloads usam orderId
  if (!orderId) throw new Error('orderPayload sem id/orderId');
  await Order.upsert({
    id: orderId,
    order_id: orderId,            // <<< preenche numero do pedido
    display_id: o.displayId ?? o.display_id,
    merchant_id: merchantId,

    // cliente
    customer_id: o.customer?.id,
    customer_name: o.customer?.name,
    customer_document: o.customer?.document,
    customer_phone: o.customer?.phone?.number,
    customer_orders_on_merchant: o.customer?.ordersCountOnMerchant ?? null,

    // metadados do pedido
    is_test: !!o.isTest,
    order_type: o.category || o.orderType || 'FOOD',
    order_timing: o.orderTiming,
    sales_channel: o.salesChannel ?? 'IFOOD', // default útil

    // preparo/entrega
    preparation_start_datetime: o.preparationStartDateTime
      ? new Date(o.preparationStartDateTime)
      : null,
    delivery_mode: o.delivery?.mode,
    delivery_description: o.delivery?.description,
    delivered_by: o.delivery?.deliveredBy,
    delivery_datetime: o.delivery?.deliveryDateTime
      ? new Date(o.delivery.deliveryDateTime)
      : null,
    delivery_observations: o.delivery?.observations ?? null,
    delivery_address: o.delivery?.deliveryAddress ?? null,
    delivery_city: o.delivery?.deliveryAddress?.city ?? null,
    delivery_state: o.delivery?.deliveryAddress?.state ?? null,
    pickup_code: o.delivery?.pickupCode,

    // totais
    subtotal: Number(o.total?.subTotal ?? 0),
    delivery_fee: Number(o.total?.deliveryFee ?? 0),
    additional_fees: Number(o.total?.additionalFees ?? 0),
    order_amount: Number(o.total?.orderAmount ?? 0),

    // pagamentos
    prepaid_amount: Number(o.payments?.prepaid ?? 0),
    pending_amount: Number(o.payments?.pending ?? 0),
  });

  const items = Array.isArray(o.items) ? o.items : [];
  for (const it of items) {
    await OrderItem.upsert({
      merchant_id: merchantId,              // 🔧 ADICIONE
      order_id: orderId,
      external_code: it.externalCode,

      // produto/item
      item_id: it.id,
      index: it.index,
      unique_id: it.uniqueId,
      name: it.name,
      type: it.type,
      ean: it.ean ?? null,

      // quantidades/valores
      quantity: Number(it.quantity) || 0,
      unit: it.unit,
      unit_price: Number(it.unitPrice) || 0,
      options_price: Number(it.optionsPrice) || 0,
      total_price: Number(it.totalPrice) || 0,
      price: Number(it.price) || 0,

      // extras
      observations: it.observations ?? null,
      image_url: it.imageUrl ?? null,
      options: null, // fica para uso futuro
      // estado do item é controlado nos handlers de transição
    });
  }
}
