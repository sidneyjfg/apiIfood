// src/services/erpInventoryService.ts
import axios from 'axios';
import { ErpStock } from '@db/models/ErpStock';
import { MerchantErpMapping } from '@db/models/MerchantErpMapping';
import { controlsIfoodStockInERP } from '@core/utils/featureFlags';
import { ErpLocation } from '@db/models';
import { sequelize } from '@config/database';

export type MovementReason =
  | 'CONSUME_ON_CON'
  | 'CANCEL_RETURN'
  | 'MANUAL_ADJUST'
  | 'SYNC_CORRECTION';

export interface AdjustParams {
  merchantId: string;
  externalCode: string;
  delta: number;
  reason: MovementReason;
  orderId?: string;
  dryRun?: boolean;
}
type ErpStoreDTO = { id: string; code?: string; name?: string; active?: boolean; };

async function postMovementToERP(payload: any) {
  const baseUrl = process.env.ERP_BASE_URL;
  if (!baseUrl) return;
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

export class ErpInventoryService {
  /**
   * 🧪 TESTE: simula criação/cancelamento de reserva no ERP (sem efeitos reais).
   */
  static async testReservationForIfood(params: {
    merchantId: string;
    externalCode: string;
    qty: number;
    action: 'CREATE' | 'CANCEL';
    orderId?: string;
  }) {
    const { merchantId, externalCode, qty, action, orderId } = params;
    console.log(
      `🧪 [ERP TEST RESERVATION] action=${action} qty=${qty} merchant=${merchantId} sku=${externalCode} order=${orderId ?? '-'}`
    );
    return true;
  }

  /**
   * 🧪 TESTE: simula movimentação física no ERP (sandbox).
   */
  static async testAdjustOnHandForIfood(params: {
    merchantId: string;
    externalCode: string;
    delta: number; // negativo = saída; positivo = entrada
    reason: MovementReason | string;
    orderId?: string;
  }) {
    const { merchantId, externalCode, delta, reason, orderId } = params;
    console.log(
      `🧪 [ERP TEST MOVE] delta=${delta} reason=${reason} merchant=${merchantId} sku=${externalCode} order=${orderId ?? '-'}`
    );
    return true;
  }

  // --- já existia ---
  static async syncErpStores(): Promise<{ total: number; upserts: number; items: ErpStoreDTO[] }> {
    const baseUrl = process.env.ERP_BASE_URL!;
    const token = process.env.ERP_API_TOKEN;
    const url = `${baseUrl.replace(/\/+$/, '')}/stores`;

    const resp = await axios.get(url, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    });

    const items: ErpStoreDTO[] = Array.isArray(resp.data) ? resp.data : [];
    let upserts = 0;

    await sequelize.transaction(async (t) => {
      for (const s of items) {
        const code = (s.code ?? s.id).toString();
        const name = s.name ?? code;
        const active = s.active ?? true;

        await ErpLocation.upsert(
          { code, name, active },
          { transaction: t }
        );
        upserts++;
      }
    });

    return { total: items.length, upserts, items };
  }

  static async adjustOnHandByMapping(params: AdjustParams) {
    const { merchantId, externalCode, delta, reason, orderId, dryRun } = params;

    const mapping = await MerchantErpMapping.findOne({ where: { merchant_id: merchantId } });
    if (!mapping) {
      console.warn(`⚠️ Sem mapping ERP para merchant_id=${merchantId}. Pular ajuste (delta=${delta}).`);
      return { ok: false, skipped: true, reason: 'no-mapping' as const };
    }

    // 🔎 buscar dados da loja ERP
    const erpLoc = await ErpLocation.findOne({ where: { id: mapping.erp_location_id } });
    const erpLocationName = erpLoc?.name ?? '';

    if (dryRun) {
      console.log(
        `🧪 [dryRun] Ajuste ERP ignorado (loc=${mapping.erp_location_id}, name=${erpLocationName}, sku=${externalCode}, delta=${delta})`
      );
      return { ok: true, dryRun: true, erp_location_id: mapping.erp_location_id, erp_location_name: erpLocationName };
    }

    const row = await ErpStock.adjustOnHand(mapping.erp_location_id, externalCode, delta);

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

    return {
      ok: true,
      erp_location_id: mapping.erp_location_id,
      erp_location_name: erpLocationName, // <<<< adicionado
      sku: externalCode,
      on_hand: row.on_hand,
    };
  }

}
