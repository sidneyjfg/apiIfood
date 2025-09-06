// src/routes/storeConfig.ts
import { Router } from 'express';
import {
  listarLojasIfood,
  syncLojasErp,
  listarLojasErp,
  upsertMapping,
  listarMappings,
} from '../controllers/storeController';

const router = Router();

/**
 * GET /storeConfig/ifood?page=&size=
 * Busca no iFood e upsert em merchants; retorna lista p/ frontend
 */
router.get('/ifood', listarLojasIfood);

/**
 * POST /storeConfig/erp/sync
 * Chama o ERP e upserta em erp_locations, retorna resultado
 */
router.post('/erp/sync', syncLojasErp);

/**
 * GET /storeConfig/erp
 * Lista erp_locations já salvas
 */
router.get('/erp', listarLojasErp);

/**
 * POST /storeConfig/map
 * Body: { merchant_id: string, erp_location_id: number }
 * Cria/atualiza o vínculo (N iFood -> 1 ERP)
 */
router.post('/map', upsertMapping);

/**
 * GET /storeConfig/mappings
 * Lista vínculos existentes
 */
router.get('/mappings', listarMappings);

export default router;
