// src/modules/merchant/routes.ts
import { Router } from 'express';
// Controllers já existentes no projeto atual
import {
  getMerchantStatus,
  createInterruption,
  listInterruptions,
  deleteInterruption,
  getOpeningHours,
  putOpeningHours,
  listarLojasIfood,
  syncLojasErp,
  listarLojasErp,
  upsertMapping,
  listarMappings,
} from './controllers/merchantController';


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

// Endpoints de Merchant (status, interrupções, horários)
router.get('/:merchantId/status', getMerchantStatus);
router.post('/:merchantId/interruptions', createInterruption);
router.get('/:merchantId/interruptions', listInterruptions);
router.delete('/:merchantId/interruptions/:interruptionId', deleteInterruption);
router.get('/:merchantId/opening-hours', getOpeningHours);
router.put('/:merchantId/opening-hours', putOpeningHours);

export default router;

