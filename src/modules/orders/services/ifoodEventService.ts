import { IfoodAuthService } from '../../authentication/services/ifoodAuthService';
import { fetchOrderDetails } from './fetchOrderDetails';
import { saveOrderSnapshot } from '@core/utils/saveOrderSnapshot';
import { processOrderItemTransition } from '@core/utils/processOrderItemTransition';
import { Order } from '@db/models/order';
import { ErpSalesService } from '@modules/merchant_loja/services/erpSalesService';

type KnownEvent =
  | 'PLC'  // PLACED
  | 'CFM'  // CONFIRMED
  | 'PRS'  // PREPARATION_STARTED
  | 'DSP'  // DISPATCHED
  | 'CAN'  // CANCELLED
  | 'CON'  // CONCLUDED
  | 'NEGOTIATION'; // eventos de negociação (não alteram estoque)

const ORDER_STATUS: Record<string, string> = {
  PLC: 'PLACED',
  CFM: 'CONFIRMED',
  PRS: 'PREPARATION_STARTED',
  DSP: 'DISPATCHED',
  CAN: 'CANCELLED',
  CON: 'CONCLUDED',
  NEGOTIATION: 'NEGOTIATION',
};

export async function processIfoodEvent(rawEvent: any) {
  // Normalização segura
  const code = String(rawEvent?.code ?? rawEvent?.type ?? '').toUpperCase() as KnownEvent;
  const orderId: string = rawEvent?.orderId ?? rawEvent?.resourceId;
  const merchantId: string = rawEvent?.merchantId ?? rawEvent?.merchant?.id;
  const fullCode: string = rawEvent?.fullCode ?? rawEvent?.type ?? code;

  if (!merchantId || !orderId || !code) {
    console.warn('⚠️ Evento inválido/incompleto:', { merchantId, orderId, code });
    return;
  }

  console.log('📨 [iFood][Event]', { merchantId, orderId, code, fullCode });

  const handled = new Set<KnownEvent>(['PLC', 'CFM', 'PRS', 'DSP', 'CAN', 'CON', 'NEGOTIATION']);
  if (!handled.has(code)) {
    console.log(`ℹ️ Evento ignorado: ${fullCode}`);
    return;
  }

  // Token (com cache/refresh pelo AuthService)
  const { access_token: accessToken } = await IfoodAuthService.getAccessToken(merchantId);

  // Detalhes do pedido (tela/comanda e regras)
  const orderData = await fetchOrderDetails(orderId, accessToken);

  // ===== Campos exigidos em tela/comanda =====
  const orderType = orderData?.orderType ?? orderData?.type ?? null;                 // DELIVERY | TAKEOUT
  const orderTiming = orderData?.orderTiming ?? orderData?.timing ?? null;           // IMMEDIATE | SCHEDULED
  const scheduledAt = orderData?.schedule?.dateTime ?? orderData?.scheduled?.dateTime ?? null;

  // Pagamentos
  const payments = Array.isArray(orderData?.payments) ? orderData.payments : [];
  let cardBrand: string | null = null;
  let cashChangeFor: number | null = null;
  for (const p of payments) {
    const method = String(p?.method ?? '').toUpperCase();
    if (['CREDIT', 'DEBIT', 'CARD'].includes(method)) {
      cardBrand = p?.brand ?? p?.card?.brand ?? cardBrand;
    }
    if (method === 'CASH') {
      const change = Number(p?.changeFor ?? p?.change);
      if (Number.isFinite(change)) cashChangeFor = change;
    }
  }

  // Cupons/benefícios
  const benefits = Array.isArray(orderData?.benefits)
    ? orderData.benefits
    : (Array.isArray(orderData?.coupons) ? orderData.coupons : []);
  const discountsValue = benefits.reduce((acc: number, b: any) => {
    const v = Number(b?.value ?? b?.amount ?? 0);
    return acc + (Number.isFinite(v) ? v : 0);
  }, 0);

  // Observações e pickup
  const deliveryObs = orderData?.delivery?.observations ?? null;
  const pickupCode = orderData?.pickupCode ?? orderData?.takeout?.pickupCode ?? null;

  // Documento do cliente
  const customerTaxId = orderData?.customer?.taxId
    ?? orderData?.customer?.documentNumber
    ?? null;

  // Totais (quando disponíveis)
  const subtotal = Number(orderData?.total?.subTotal ?? orderData?.subTotal);
  const deliveryFee = Number(orderData?.total?.deliveryFee ?? orderData?.deliveryFee);
  const total = Number(orderData?.total?.order ?? orderData?.orderAmount ?? orderData?.total);
  const prepaid = Number(orderData?.paymentsSummary?.prepaid ?? orderData?.prepaidAmount);
  const pending = Number(orderData?.paymentsSummary?.pending ?? orderData?.pendingAmount);

  // Snapshot completo (mantém sua função atual)
  await saveOrderSnapshot(merchantId, orderData);

  // ===== Atualização da tabela orders (usa order_id no WHERE) =====
  await Order.update(
    {
      status: ORDER_STATUS[code] ?? code,
      last_event_code: code,
      last_event_at: new Date(),

      // preenchimentos de homologação / exibição
      order_type: orderType ?? undefined,
      order_timing: orderTiming ?? undefined,
      delivery_datetime: scheduledAt ? new Date(scheduledAt) : undefined, // para SCHEDULED
      delivery_observations: deliveryObs ?? undefined,
      pickup_code: pickupCode ?? undefined,
      customer_document: customerTaxId ?? undefined,

      // valores (apenas se vierem válidos)
      subtotal: Number.isFinite(subtotal) ? subtotal : undefined,
      delivery_fee: Number.isFinite(deliveryFee) ? deliveryFee : undefined,
      total: Number.isFinite(total) ? total : undefined,
      prepaid_amount: Number.isFinite(prepaid) ? prepaid : undefined,
      pending_amount: Number.isFinite(pending) ? pending : undefined,
    } as any,
    {
      where: { order_id: orderId, merchant_id: merchantId }, // <<== usa order_id
    }
  );

  // NEGOTIATION não mexe em estoque — já cumprimos auditoria/status
  if (code === 'NEGOTIATION') return;

  // ===== Fluxo de estoque por item (seu comportamento atual) =====
  const items = Array.isArray(orderData?.items) ? orderData.items : [];
  if (items.length === 0) {
    console.warn(`⚠️ Pedido ${orderId} sem itens.`);
    return;
  }

  for (const it of items) {
    const externalCode: string | undefined = it.externalCode;
    const qty = Number(it.quantity);
    if (!externalCode || !Number.isFinite(qty)) continue;

    await processOrderItemTransition({
      merchantId,
      orderId,
      itemExternalCode: externalCode,
      itemUniqueId: it.uniqueId,
      itemQty: qty,
      eventCode: code, // PLC/CFM/PRS/DSP/CAN/CON
      accessToken,
    });
  }

  // ===== Integração ERP =====
  try {
    if (code === 'CFM') {
      const res = await ErpSalesService.createSaleFromIfoodOrder({ merchantId, order: orderData });
      if (!res.ok && !res?.alreadyExists) {
        console.warn(`⚠️ Venda ERP não criada (order=${orderId}).`, res);
      }
    } else if (code === 'CAN') {
      console.log(`🧾 [ERP][CAN] solicitando CANCELAMENTO da venda (merchant=${merchantId}, order=${orderId})`);
      const res = await ErpSalesService.cancelSaleByKey({ merchantId, orderId });
      console.log(`🧾 [ERP][CAN] retorno=${res.ok ? 'OK' : 'FAIL'} status=${res.status ?? res.reason ?? 'n/a'}`);
    } else if (code === 'CON') {
      console.log(`🧾 [ERP][CON] solicitando FINALIZAÇÃO da venda (merchant=${merchantId}, order=${orderId})`);
      const res = await ErpSalesService.finalizeSaleByKey({ merchantId, orderId });
      console.log(`🧾 [ERP][CON] retorno=${res.ok ? 'OK' : 'FAIL'} status=${res.status ?? res.reason ?? 'n/a'}`);
    }
  } catch (e: any) {
    console.error('❌ Erro ao integrar venda no ERP:', e?.message || e);
  }
}
