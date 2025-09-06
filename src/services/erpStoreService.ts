// src/services/erpInventoryService.ts
import axios from 'axios';
import { ErpStock } from '../database/models/ErpStock';
import { MerchantErpMapping } from '../database/models/MerchantErpMapping';
import { controlsIfoodStockInERP } from '../utils/featureFlags';

export type MovementReason =
  | 'CONSUME_ON_CON'     // baixa física ao concluir pedido (CON)
  | 'CANCEL_RETURN'      // devolução física ao cancelar (se aplicável)
  | 'MANUAL_ADJUST'      // ajuste manual / PDV
  | 'SYNC_CORRECTION';   // correção em sync

export interface AdjustParams {
  merchantId: string;
  externalCode: string;   // SKU do ERP (use products.external_code)
  delta: number;          // negativo para consumir, positivo para devolver
  reason: MovementReason;
  orderId?: string;
  dryRun?: boolean;
}

/**
 * POST opcional para o ERP real (se existir endpoint).
 * Não falha o fluxo em caso de erro: só loga warning.
 */
async function postMovementToERP(payload: any) {
  const baseUrl = process.env.ERP_BASE_URL;
  if (!baseUrl) return; // sem endpoint configurado, apenas persiste local

  const token = process.env.ERP_API_TOKEN ?? '';
  const url = `${baseUrl.replace(/\/+$/, '')}/inventory/movements`;

  try {
    await axios.post(url, payload, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 12000,
      validateStatus: () => true,
    });
  } catch (err: any) {
    const status = err?.response?.status ?? '???';
    const data = err?.response?.data ?? err?.message;
    console.warn(`⚠️ ERP movement not sent (status ${status}):`, data);
  }
}

/**
 * Ajusta estoque no ERP (tabela local erp_stock) com base no De→Para (merchant → erp_location).
 * Se CONTROLA_IFOOD_ESTOQUE=1, este passa a ser o único controlador de estoque físico.
 */
export class ErpInventoryService {
  static async adjustOnHandByMapping(params: AdjustParams) {
    const { merchantId, externalCode, delta, reason, orderId, dryRun } = params;

    const mapping = await MerchantErpMapping.findOne({ where: { merchant_id: merchantId } });
    if (!mapping) {
      console.warn(`⚠️ Sem mapping ERP para merchant_id=${merchantId}. Pular ajuste (delta=${delta}).`);
      return { ok: false, skipped: true, reason: 'no-mapping' as const };
    }

    if (dryRun) {
      console.log(`🧪 [dryRun] Ajuste ERP ignorado (loc=${mapping.erp_location_id}, sku=${externalCode}, delta=${delta})`);
      return { ok: true, dryRun: true, erp_location_id: mapping.erp_location_id };
    }

    // Persistência local
    const row = await ErpStock.adjustOnHand(mapping.erp_location_id, externalCode, delta);

    // Notificação opcional ao ERP
    const payload = {
      erpLocationId: mapping.erp_location_id,
      sku: externalCode,
      delta,
      reason,
      orderId: orderId ?? null,
      controller: controlsIfoodStockInERP() ? 'ERP' : 'IFOOD_INTEGRATION',
      at: new Date().toISOString(),
    };
    await postMovementToERP(payload);

    return { ok: true, erp_location_id: mapping.erp_location_id, sku: externalCode, on_hand: row.on_hand };
  }
}
