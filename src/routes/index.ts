import { Router } from 'express';
import ifoodRoutes from './ifoodRoutes';

const router = Router();

router.use('/', ifoodRoutes);

export default router;
