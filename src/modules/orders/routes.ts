import { Router } from 'express';
import { handleIfoodWebhook } from './controllers/orderWebhookController';

const router = Router();

// Webhook de pedidos iFood
router.post('/webhook/ifood', handleIfoodWebhook);

// Aqui você pode adicionar reprocessos/consultas:
// router.post('/:orderId/retry', retryOrder);

export default router;
