import { Router } from 'express';
import ifoodRoutes from './ifoodRoutes';
import lojasRoutes from './storeRoutes';

const router = Router();

router.use('/', ifoodRoutes);    // suas rotas antigas
router.use('/storeConfig', lojasRoutes); // nova raiz para buscar lojas

export default router;
