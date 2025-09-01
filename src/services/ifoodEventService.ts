import { IfoodAuthService } from './ifoodAuthService';
import { fetchOrderDetails } from './fetchOrderDetails';
import { saveOrderSnapshot } from '../utils/saveOrderSnapshot';
import { processOrderItemTransition } from '../utils/processOrderItemTransition';
import { Order } from '../database/models/order';

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
  const { code, fullCode, orderId, merchantId } = event as { code: KnownEvent; fullCode: string; orderId: string; merchantId: string };
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
    return;
  }

  // Regras de estoque:
  // - PLC: NÃO reserva (apenas audita item)
  // - CFM: reserva (idempotente)
  // - CAN: cancela reserva se houver
  // - CON: consome reserva se houver
  // - PRS/DSP: só trilha de status; nada no estoque
  for (const it of items) {
    const externalCode: string | undefined = it.externalCode;
    const qty = Number(it.quantity);
    if (!externalCode || !Number.isFinite(qty)) continue;

    // Passa o evento cru — a função interna decide o que fazer
    await processOrderItemTransition({
      merchantId,
      orderId,
      itemExternalCode: externalCode,
      itemUniqueId: it.uniqueId,
      itemQty: qty,
      eventCode: code,     // <<<< agora aceitamos PLC/CFM/PRS/DSP/CAN/CON
      accessToken,
    });
  }
}
