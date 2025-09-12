// src/routes/index.ts
import { Router } from 'express';
import merchantRoutes from '../modules/merchant_loja/routes';
import storeConfigRoutes from '../modules/merchant_loja/routes';
import catalogRoutes from '../modules/catalog/routes';
import orderRoutes from '../modules/orders/routes';
import eventsRoutes from '../modules/events/routes';

const router = Router();

router.use('/merchants', merchantRoutes);
router.use('/storeConfig', storeConfigRoutes);
router.use('/', catalogRoutes);          // mantém endpoints /ifood/* existentes
router.use('/', orderRoutes);            // mantém /webhook/ifood
router.use('/events', eventsRoutes);

export default router;
