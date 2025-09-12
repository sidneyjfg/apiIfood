// src/services/ifoodEventService.ts
import { IfoodAuthService } from '../../authentication/services/ifoodAuthService';
import { fetchOrderDetails } from './fetchOrderDetails';
import { saveOrderSnapshot } from '@core/utils/saveOrderSnapshot';
import { processOrderItemTransition } from '@core/utils/processOrderItemTransition';
import { Order } from '@db/models/order';
import { ErpSalesService } from '@modules/merchant_loja/services/erpSalesService'; // ajuste o alias se necessário

type KnownEvent =
  | 'PLC'  // PLACED
  | 'CFM'  // CONFIRMED
  | 'PRS'  // PREPARATION_STARTED
  | 'DSP'  // DISPATCHED
  | 'CAN'  // CANCELLED
  | 'CON'; // CONCLUDED

const ORDER_STATUS: Record<KnownEvent, string> = {
  PLC: 'PLACED',
  CFM: 'CONFIRMED',
  PRS: 'PREPARATION_STARTED',
  DSP: 'DISPATCHED',
  CAN: 'CANCELLED',
  CON: 'CONCLUDED',
};

export async function processIfoodEvent(event: any) {
  const { code, fullCode, orderId, merchantId } = event as {
    code: KnownEvent; fullCode: string; orderId: string; merchantId: string
  };
  console.log(event);

  const handled: KnownEvent[] = ['PLC', 'CFM', 'PRS', 'DSP', 'CAN', 'CON'];
  if (!handled.includes(code)) {
    console.log(`ℹ️ Evento ignorado: ${fullCode}`);
    return;
  }

  const { access_token: accessToken } = await IfoodAuthService.getAccessToken(merchantId);

  // 1) Detalhes do pedido
  const orderData = await fetchOrderDetails(orderId, accessToken);

  // 2) Snapshot (não mexe em status aqui)
  await saveOrderSnapshot(merchantId, orderData);

  // 3) Atualiza STATUS do pedido
  await Order.update(
    {
      status: ORDER_STATUS[code],
      last_event_code: code,
      last_event_at: new Date(),
    },
    { where: { id: orderId, merchant_id: merchantId } }
  );

  // 4) Itens do pedido
  const items = Array.isArray(orderData?.items) ? orderData.items : [];
  if (items.length === 0) {
    console.warn(`⚠️ Pedido ${orderId} sem itens.`);
    // mesmo sem itens, nada a reservar/consumir; não cria/atualiza venda
    return;
  }

  // Regras de estoque:
  // - PLC: NÃO reserva (apenas audita item)
  // - CFM: reserva (idempotente)
  // - CAN: cancela reserva se houver
  // - CON: consome reserva se houver
  // - PRS/DSP: trilha de status; nada no estoque
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

  // 5) Integração de venda no ERP por evento (depois das reservas)
  try {
    if (code === 'CFM') {
      const res = await ErpSalesService.createSaleFromIfoodOrder({ merchantId, order: orderData });
      if (!res.ok && !res?.alreadyExists) {
        console.warn(`⚠️ Venda ERP não criada (order=${orderId}).`, res);
      }
    } else if (code === 'CAN') {
      console.log(`🧾 [ERP][CAN] solicitando CANCELAMENTO da venda (merchant=${merchantId}, order=${orderId})`);
      const res = await ErpSalesService.cancelSaleByKey({ merchantId, orderId });
      console.log(
        `🧾 [ERP][CAN] retorno=${res.ok ? 'OK' : 'FAIL'} status=${res.status ?? res.reason ?? 'n/a'}`
      );
    } else if (code === 'CON') {
      console.log(`🧾 [ERP][CON] solicitando FINALIZAÇÃO da venda (merchant=${merchantId}, order=${orderId})`);
      const res = await ErpSalesService.finalizeSaleByKey({ merchantId, orderId });
      console.log(
        `🧾 [ERP][CON] retorno=${res.ok ? 'OK' : 'FAIL'} status=${res.status ?? res.reason ?? 'n/a'}`
      );
    }
  } catch (e: any) {
    console.error('❌ Erro ao integrar venda no ERP:', e?.message || e);
  }
}
