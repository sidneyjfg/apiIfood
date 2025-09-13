// src/modules/catalog/routes.ts
import { Router } from 'express';
// Usando seu controller atual de produtos do iFood
import {
  syncIfoodItemsAll,
  getProductByExternalCode,
  getProductById,
} from '@modules/catalog/controllers/productController';
import {
  listCatalogsController,
  listCategoriesController,
  createCategoryController,
  putItemController,
  patchItemsPriceController,
  patchItemsStatusController,
  patchOptionsPriceController,
  patchOptionsStatusController,
  uploadImageController,
} from './controllers/catalogController';


const router = Router();

router.get('/ifood/items/sync', syncIfoodItemsAll);
router.get('/ifood/products/external/:externalCode', getProductByExternalCode);
router.get('/ifood/products/:productId', getProductById);


/**
 * GET /catalog/catalogs?merchantId=...
 */
router.get('/catalogs', listCatalogsController);

/**
 * GET /catalog/catalogs/:catalogId/categories?merchantId=...&includeItems=true|false
 */
router.get('/catalogs/:catalogId/categories', listCategoriesController);

/**
 * POST /catalog/catalogs/:catalogId/categories?merchantId=...
 * body: { name, externalCode, ... }
 */
router.post('/catalogs/:catalogId/categories', createCategoryController);

/**
 * PUT /catalog/items?merchantId=...
 * body: item completo (payload iFood)
 */
router.put('/items', putItemController);

/**
 * PATCH /catalog/items/price
 * body: { merchantId, items: [{ externalCode, price }] }
 */
router.patch('/items/price', patchItemsPriceController);

/**
 * PATCH /catalog/items/status
 * body: { merchantId, items: [{ externalCode, status: 'AVAILABLE'|'UNAVAILABLE' }] }
 */
router.patch('/items/status', patchItemsStatusController);

/**
 * PATCH /catalog/options/price
 * body: { merchantId, options: [{ externalCode, price }] }
 */
router.patch('/options/price', patchOptionsPriceController);

/**
 * PATCH /catalog/options/status
 * body: { merchantId, options: [{ externalCode, status: 'AVAILABLE'|'UNAVAILABLE' }] }
 */
router.patch('/options/status', patchOptionsStatusController);

/**
 * POST /catalog/image/upload
 * body: { merchantId, filename?, contentType?, imageBase64? }
 * (ou use multipart e passe req.file)
 */
router.post('/image/upload', uploadImageController);

export default router;
