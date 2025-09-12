import { Request, Response } from 'express';
import { IfoodOrderActionsService } from '../services/ifoodOrderActionsService';

// GET /orders/:orderId/cancellation-reasons?merchantId=...
export async function getCancellationReasonsController(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const { merchantId } = req.query as any;
    if (!merchantId) {
      return res.status(400).json({ message: 'merchantId é obrigatório' });
    }

    const reasons = await IfoodOrderActionsService.getCancellationReasons(merchantId, orderId);
    res.json({ orderId, reasons });
  } catch (err: any) {
    console.error('❌ Falha ao listar motivos de cancelamento', err?.response?.data ?? err);
    res.status(500).json({ message: 'Erro interno ao consultar motivos de cancelamento' });
  }
}

// POST /orders/:orderId/cancel
// body: { merchantId, reasonId, comment? }
export async function cancelOrderController(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const { merchantId, reasonId, comment } = req.body ?? {};
    if (!merchantId || !reasonId) {
      return res.status(400).json({ message: 'merchantId e reasonId são obrigatórios' });
    }

    const result = await IfoodOrderActionsService.cancelOrder(merchantId, orderId, reasonId, comment);
    res.json({ ok: true, orderId, result });
  } catch (err: any) {
    console.error('❌ Falha ao cancelar pedido', err?.response?.data ?? err);
    res.status(500).json({ message: 'Erro interno ao cancelar pedido' });
  }
}

// POST /orders/:orderId/ready
// body: { merchantId }
export async function markReadyForPickupController(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const { merchantId } = req.body ?? {};
    if (!merchantId) {
      return res.status(400).json({ message: 'merchantId é obrigatório' });
    }

    const result = await IfoodOrderActionsService.markReadyForPickup(merchantId, orderId);
    res.json({ ok: true, orderId, result });
  } catch (err: any) {
    console.error('❌ Falha ao marcar pedido como pronto', err?.response?.data ?? err);
    res.status(500).json({ message: 'Erro interno ao marcar pedido como pronto' });
  }
}
