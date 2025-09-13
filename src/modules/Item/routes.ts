import { Router } from 'express';
import {
  postItemIngestionController,
  patchItemIngestionController,
} from './controllers/itemIngestionController';

const router = Router();

/**
 * POST /item/v1.0/ingestion/:merchantId?reset=false
 * Body: payload de ingestion no formato do iFood (itens, categorias, options, vínculos etc.)
 */
router.post('/item/v1.0/ingestion/:merchantId', postItemIngestionController);

/**
 * PATCH /item/v1.0/ingestion/:merchantId
 * Body: payload parcial (somente campos/objetos que devem ser alterados).
 */
router.patch('/item/v1.0/ingestion/:merchantId', patchItemIngestionController);

export default router;
