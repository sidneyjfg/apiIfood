import { Router } from 'express';
import { getCancellationReasonsController, cancelOrderController, markReadyForPickupController, confirm, dispatch } from './controllers/orderActionsController';
import { handleIfoodWebhook } from './controllers/orderWebhookController';
const router = Router();

// Webhook de pedidos iFood
router.post('/webhook/ifood', handleIfoodWebhook);

// Listar motivos de cancelamento
router.get('/:orderId/cancellation-reasons', getCancellationReasonsController);

// Cancelar pedido
router.post('/:orderId/cancel', cancelOrderController);

// Marcar pedido como pronto (TAKEOUT)
router.post('/:orderId/ready', markReadyForPickupController);

router.post('/:orderId/confirm', confirm);    // ?merchantId=...

router.post('/:orderId/dispatch', dispatch);  // ?merchantId=...

export default router;
