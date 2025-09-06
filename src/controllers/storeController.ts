// src/controllers/storeConfigController.ts
import { Request, Response } from 'express';
import { IfoodMerchantService } from '../services/ifoodMerchantService';
import { ErpStoreService } from '../services/erpStoreService';
import { ErpLocation } from '../database/models/ErpLocation';
import { MerchantErpMapping } from '../database/models/MerchantErpMapping';
import { Merchant } from '../database/models/merchants';
import { sequelize } from '../config/database';

// GET /storeConfig/ifood?page=&size=
// Lista (ou sincroniza e lista) merchants do iFood (igual seu buscarLojas).
export async function listarLojasIfood(req: Request, res: Response) {
  try {
    const page = Number(req.query.page ?? 1) || 1;
    const size = Math.min(200, Number(req.query.size ?? 100) || 100);
    const result = await IfoodMerchantService.syncMerchantsToDB(page, size);
    return res.json(result);
  } catch (err: any) {
    const msg = err?.response?.data || err?.message || 'Erro ao buscar/gravar lojas iFood';
    return res.status(500).json({ error: msg });
  }
}

// POST /storeConfig/erp/sync
// Sincroniza lojas do ERP -> erp_locations e retorna lista
export async function syncLojasErp(req: Request, res: Response) {
  try {
    const result = await ErpStoreService.syncErpStores();
    return res.json(result);
  } catch (err: any) {
    const msg = err?.response?.data || err?.message || 'Erro ao sincronizar lojas do ERP';
    return res.status(500).json({ error: msg });
  }
}

// GET /storeConfig/erp
// Lista locations ERP (já sincronizadas)
export async function listarLojasErp(req: Request, res: Response) {
  try {
    const rows = await ErpLocation.findAll({
      order: [['code', 'ASC']]
    });
    return res.json(rows.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      active: r.active
    })));
  } catch (err: any) {
    const msg = err?.message || 'Erro ao listar lojas ERP';
    return res.status(500).json({ error: msg });
  }
}

// POST /storeConfig/map
// Body: { merchant_id: string, erp_location_id: number }
// Cria/atualiza o mapeamento N iFood -> 1 ERP
export async function upsertMapping(req: Request, res: Response) {
  try {
    const { merchant_id, erp_location_id } = req.body ?? {};

    if (!merchant_id || !erp_location_id) {
      return res.status(400).json({ error: 'merchant_id e erp_location_id são obrigatórios' });
    }

    // valida existências básicas (sem associações)
    const [merchantRow, erpLoc] = await Promise.all([
      Merchant.findOne({ where: { merchant_id: String(merchant_id) } }),
      ErpLocation.findByPk(Number(erp_location_id)),
    ]);
    if (!merchantRow) return res.status(404).json({ error: 'merchant_id não encontrado' });
    if (!erpLoc)      return res.status(404).json({ error: 'erp_location_id não encontrado' });

    const payload = { merchant_id: String(merchant_id), erp_location_id: Number(erp_location_id) };

    await sequelize.transaction(async (t) => {
      await MerchantErpMapping.upsert(payload, { transaction: t });
    });

    return res.json({ ok: true, mapping: payload });
  } catch (err: any) {
    const msg = err?.message || 'Erro ao salvar mapeamento';
    return res.status(500).json({ error: msg });
  }
}

// GET /storeConfig/mappings
// Lista todos os vínculos existentes (join "manual")
export async function listarMappings(req: Request, res: Response) {
  try {
    // join manual via duas queries para manter independente de associações
    const [maps, erpLocs, merchants] = await Promise.all([
      MerchantErpMapping.findAll(),
      ErpLocation.findAll(),
      Merchant.findAll()
    ]);

    const erpById = new Map(erpLocs.map(l => [l.id, l]));
    const merchById = new Map(merchants.map(m => [m.merchant_id, m]));

    const items = maps.map(m => {
      const erp = erpById.get(m.erp_location_id);
      const mer = merchById.get(m.merchant_id);
      return {
        merchant_id: m.merchant_id,
        merchant_name: mer?.name ?? m.merchant_id,
        erp_location_id: m.erp_location_id,
        erp_code: erp?.code,
        erp_name: erp?.name
      };
    });

    return res.json({ total: items.length, items });
  } catch (err: any) {
    const msg = err?.message || 'Erro ao listar mapeamentos';
    return res.status(500).json({ error: msg });
  }
}
