import { Router } from 'express';
import { getCancellationReasonsController, cancelOrderController, markReadyForPickupController } from './controllers/orderActionsController';

const router = Router();

// Listar motivos de cancelamento
router.get('/:orderId/cancellation-reasons', getCancellationReasonsController);

// Cancelar pedido
router.post('/:orderId/cancel', cancelOrderController);

// Marcar pedido como pronto (TAKEOUT)
router.post('/:orderId/ready', markReadyForPickupController);

export default router;
