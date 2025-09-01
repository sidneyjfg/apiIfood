import { Router } from 'express';
import { buscarLojas } from '../controllers/storeController';

const router = Router();

/**
 * GET /lojas
 * Lista lojas do iFood usando credenciais salvas em user_api_ifood
 * Query params opcionais: ?page=1&size=100
 */
router.get('/', buscarLojas);

export default router;
