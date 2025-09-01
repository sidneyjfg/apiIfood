// services/ifoodEventService.ts
import { IfoodAuthService } from './ifoodAuthService';
import { fetchOrderDetails } from './fetchOrderDetails';
import { saveOrderSnapshot } from '../utils/saveOrderSnapshot';
import { processOrderItemTransition } from '../utils/processOrderItemTransition';

export async function processIfoodEvent(event: any) {
  const { code, fullCode, orderId, merchantId } = event;

  if (!['PLC', 'CAN', 'CON'].includes(code)) {
    console.log(`ℹ️ Evento ignorado: ${fullCode}`);
    return;
  }

  const { access_token: accessToken } = await IfoodAuthService.getAccessToken();
  if (!accessToken) throw new Error('Access token do iFood ausente');

  let orderData: any;
  try {
    orderData = await fetchOrderDetails(orderId, accessToken);
  } catch (error: any) {
    console.error(`❌ Erro ao obter detalhes do pedido ${orderId}:`, error.message);
    return;
  }

  // snapshot antes de mexer em estoque
  try {
    await saveOrderSnapshot(merchantId, orderData);
  } catch (err: any) {
    console.error(`❌ Falha ao salvar snapshot do pedido ${orderId}. Abortando processamento.`, err?.message ?? err);
    return;
  }

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
      eventCode: code as 'PLC' | 'CAN' | 'CON',
      accessToken,
    });
  }
}
