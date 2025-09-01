// utils/stockMovements.ts
import { Product } from '../database/models/products';
import { StockLog } from '../database/models/stock_logs';

type MoveKind = 'RESERVE' | 'CANCEL' | 'CONCLUDE';

export async function applyStockMovement(
  kind: MoveKind,
  product: Product,
  qty: number,
  orderId: string
): Promise<void> {
  const oldQty = product.quantity ?? 0;
  const oldRes = product.reserved_quantity ?? 0;

  let newQty = oldQty;
  let newRes = oldRes;
  let msg = '';

  switch (kind) {
    case 'RESERVE':
      newRes = oldRes + qty;
      newQty = Math.max(oldQty - qty, 0);
      msg = `Reservado ${qty} para pedido ${orderId}`;
      break;

    case 'CANCEL':
      newRes = Math.max(oldRes - qty, 0);
      newQty = oldQty + qty;
      msg = `Cancelamento liberou ${qty} para pedido ${orderId}`;
      break;

    case 'CONCLUDE':
      newRes = Math.max(oldRes - qty, 0);
      // quantity NÃO muda na conclusão (já foi baixado na reserva)
      msg = `Baixa definitiva de ${qty} do pedido ${orderId}`;
      break;
  }

  product.quantity = newQty;
  product.reserved_quantity = newRes;
  await product.save();

  await StockLog.create({
    product_sku: product.external_code,
    source: 'IFOOD',
    old_quantity: oldQty,
    new_quantity: newQty, // agora refletindo a nova quantity como você pediu
    status: 'SUCCESS',
    message: msg,
  });
}

/**
 * Calcula o "amount" que será enviado ao iFood.
 * Como você está abatendo quantity na reserva, o número que melhor
 * representa o disponível para venda no app é a própria `quantity`
 * pós-movimentação (sem subtrair reserved de novo).
 */
export function computeIfoodAmountAfter(kind: MoveKind, product: Product, qty: number) {
  const q = product.quantity ?? 0;
  const r = product.reserved_quantity ?? 0;

  switch (kind) {
    case 'RESERVE':
      return Math.max(q - qty, 0); // quantity ficará q-qty depois
    case 'CANCEL':
      return q + qty;              // quantity ficará q+qty depois
    case 'CONCLUDE':
      return q;                    // quantity permanece igual
  }
}
