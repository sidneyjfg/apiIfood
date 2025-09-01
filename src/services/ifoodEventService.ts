import { Product } from '../database/models/products';
import { updateIfoodStock } from './ifoodStockService';
import { IfoodAuthService } from './ifoodAuthService';
import { fetchOrderDetails } from './fetchOrderDetails';
import { getProductById } from '../utils/getProductById';
import { applyStockMovement, computeIfoodAmountAfter } from '../utils/stockMoviments';

export async function processIfoodEvent(event: any) {
  const { code, fullCode, orderId, merchantId } = event;

  if (!['PLC', 'CAN', 'CON'].includes(code)) {
    console.log(`ℹ️ Evento ignorado: ${fullCode}`);
    return;
  }

  const { access_token: accessToken } = await IfoodAuthService.getAccessToken();
  if (!accessToken) throw new Error('Access token do iFood ausente');

  let orderData;
  try {
    orderData = await fetchOrderDetails(orderId, accessToken);
  } catch (error: any) {
    console.error(`❌ Erro ao obter detalhes do pedido ${orderId}:`, error.message);
    return;
  }

  const items = orderData?.items || [];
  if (!Array.isArray(items)) {
    console.warn(`⚠️ Pedido ${orderId} sem itens.`);
    return;
  }

  for (const item of items) {
    const externalCode: string | undefined = item.externalCode;
    const ean: string | undefined = item.ean;
    const qty = Number(item.quantity);
    if ((!externalCode && !ean) || !Number.isFinite(qty)) continue;

    const product = await Product.findOne({ where: { external_code: externalCode, merchant_id: merchantId } });
    if (!product) {
      console.warn(`⚠️ Produto não encontrado para SKU ${externalCode}`);
      continue;
    }

    switch (code) {
      case 'PLC':
        await handlePlaced(product, qty, orderId, accessToken, merchantId);
        break;
      case 'CAN':
        await handleCancelled(product, qty, orderId, accessToken, merchantId);
        break;
      case 'CON':
        await handleConcluded(product, qty, orderId, accessToken, merchantId);
        break;
    }
  }
}

async function handlePlaced(product: Product, qty: number, orderId: string, token: string, merchantId: string) {
  const productId = await getProductById(merchantId, product.external_code, product.ean);
  if (!productId) {
    console.warn(`⚠️ product_id não encontrado (merchant=${merchantId}, external=${product.external_code}, ean=${product.ean})`);
    return;
  }

  // amount que queremos que passe a aparecer no iFood APÓS a reserva
  const amount = Math.max(computeIfoodAmountAfter('RESERVE', product, qty), 0);

  // 1) iFood primeiro
  const ok = await updateIfoodStock(merchantId, productId, amount, token);
  if (!ok) return;

  // 2) Se deu certo no iFood, aplicar no banco
  await applyStockMovement('RESERVE', product, qty, orderId);
}

async function handleCancelled(product: Product, qty: number, orderId: string, token: string, merchantId: string) {
  const productId = await getProductById(merchantId, product.external_code, product.ean);
  if (!productId) {
    console.warn(`⚠️ product_id não encontrado (merchant=${merchantId}, external=${product.external_code}, ean=${product.ean})`);
    return;
  }

  const amount = Math.max(computeIfoodAmountAfter('CANCEL', product, qty), 0);
  const ok = await updateIfoodStock(merchantId, productId, amount, token);
  if (!ok) return;

  await applyStockMovement('CANCEL', product, qty, orderId);
}

async function handleConcluded(product: Product, qty: number, orderId: string, token: string, merchantId: string) {
  const productId = await getProductById(merchantId, product.external_code, product.ean);
  if (!productId) {
    console.warn(`⚠️ product_id não encontrado (merchant=${merchantId}, external=${product.external_code}, ean=${product.ean})`);
    return;
  }

  const amount = Math.max(computeIfoodAmountAfter('CONCLUDE', product, qty), 0);
  console.log('Enviando atualização para o produto:', productId);

  const ok = await updateIfoodStock(merchantId, productId, amount, token);
  if (!ok) return;

  await applyStockMovement('CONCLUDE', product, qty, orderId);
}
