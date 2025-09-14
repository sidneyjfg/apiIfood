import { Request, Response } from 'express';
import { IfoodOrderActionsService } from '../services/ifoodOrderActionsService';
import { canDispatchByLocalState } from '@core/utils/orderGuards';
import { Order } from '@db/models';

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

export const confirm = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { merchantId } = req.query as { merchantId?: string };
    if (!merchantId) return res.status(400).json({ message: 'merchantId é obrigatório' });

    const result = await IfoodOrderActionsService.confirmOrder(merchantId, orderId);
    return res.status(200).json({ message: 'Pedido confirmado no iFood', ...result });
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    return res.status(status).json({
      message: 'Falha ao confirmar pedido no iFood',
      details: err?.response?.data ?? err?.message,
    });
  }
};

export const dispatch = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { merchantId } = req.query as { merchantId?: string };
    if (!merchantId) return res.status(400).json({ message: 'merchantId é obrigatório' });

    // 1) Carrega o estado local do pedido
    const order = await Order.findOne({
      where: { merchant_id: merchantId, order_id: orderId },
      attributes: ['id', 'order_id', 'merchant_id', 'status', 'last_event_code'],
    });

    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado para este merchant' });
    }

    // 2) Trava de homologação: só deixa despachar se já estiver confirmado/ready
    if (!canDispatchByLocalState(order)) {
      return res.status(409).json({
        message: 'Não é possível despachar antes de confirmar o pedido.',
        details: {
          expected: 'status = CONFIRMED ou READY (ou last_event_code = CFM/READY)',
          current: { status: order.status, last_event_code: order.last_event_code },
          hint: 'Confirme o pedido primeiro (POST /orders/:orderId/confirm).',
        },
      });
    }

    // 3) Chama o iFood (idempotente; se já despachado, retorna 2xx)
    const data = await IfoodOrderActionsService.dispatchOrder(merchantId, orderId);

    // 4) (Opcional) Atualiza estado local otimista; o evento do iFood vai consolidar depois
    await order.update({ status: 'DISPATCHED', last_event_code: 'DSP' }).catch(() => { });

    return res.status(200).json({ message: 'Pedido despachado no iFood', data });
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    return res.status(status).json({
      message: 'Falha ao despachar pedido no iFood',
      details: err?.response?.data ?? err?.message,
    });
  }
};