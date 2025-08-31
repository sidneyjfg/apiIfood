import { Product } from '../database/models/products';
import { StockLog } from '../database/models/stock_logs';
import { updateIfoodStock } from './ifoodStockService';
import { IfoodAuthService } from './ifoodAuthService';
import { fetchOrderDetails } from './fetchOrderDetails';

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
        const sku = item.externalCode;
        const qty = parseInt(item.quantity, 10);
        if (!sku || isNaN(qty)) continue;

        const product = await Product.findOne({ where: { external_code: sku, merchant_id: merchantId } });
        if (!product) {
            console.warn(`⚠️ Produto não encontrado para SKU ${sku}`);
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
    const availableQty = product.quantity ?? 0;
    const reservedQty = product.reserved_quantity ?? 0;

    if (availableQty >= qty) {
        product.reserved_quantity = reservedQty + qty;
        await product.save();

        await StockLog.create({
            product_sku: product.external_code,
            source: 'IFOOD',
            old_quantity: availableQty,
            new_quantity: availableQty,
            status: 'SUCCESS',
            message: `Reservado ${qty} para pedido ${orderId}`,
        });

        await updateIfoodStock(
            merchantId,
            product.product_id,
            availableQty - (reservedQty + qty),
            token
        );
    }
}


async function handleCancelled(product: Product, qty: number, orderId: string, token: string, merchantId: string) {
    const availableQty = product.quantity ?? 0;
    const reservedQty = product.reserved_quantity ?? 0;

    product.reserved_quantity = Math.max(reservedQty - qty, 0);
    await product.save();

    await StockLog.create({
        product_sku: product.external_code,
        source: 'IFOOD',
        old_quantity: availableQty,
        new_quantity: availableQty,
        status: 'SUCCESS',
        message: `Cancelamento liberou ${qty} para pedido ${orderId}`,
    });

    await updateIfoodStock(
        merchantId,
        product.product_id,
        availableQty - product.reserved_quantity,
        token
    );
}


async function handleConcluded(product: Product, qty: number, orderId: string, token: string, merchantId: string) {
    const availableQty = product.quantity ?? 0;
    const reservedQty = product.reserved_quantity ?? 0;

    const newQty = Math.max(availableQty - qty, 0);
    const newReserved = Math.max(reservedQty - qty, 0);

    product.quantity = newQty;
    product.reserved_quantity = newReserved;
    await product.save();

    await StockLog.create({
        product_sku: product.external_code,
        source: 'IFOOD',
        old_quantity: availableQty,
        new_quantity: newQty,
        status: 'SUCCESS',
        message: `Baixa definitiva de ${qty} do pedido ${orderId}`,
    });

    await updateIfoodStock(
        merchantId,
        product.product_id,
        newQty - newReserved,
        token
    );
}