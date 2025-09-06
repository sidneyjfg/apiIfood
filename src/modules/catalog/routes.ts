// src/modules/catalog/routes.ts
import { Router } from 'express';
// Usando seu controller atual de produtos do iFood
import {
  syncIfoodItemsAll,
  getProductByExternalCode,
  getProductById,
} from '@modules/catalog/controllers/productController';

const router = Router();

// Mantém compatibilidade com endpoints existentes
router.get('/ifood/items/sync', syncIfoodItemsAll);
router.get('/ifood/products/external/:externalCode', getProductByExternalCode);
router.get('/ifood/products/:productId', getProductById);

export default router;
