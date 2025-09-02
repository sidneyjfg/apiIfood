// src/services/ifoodUnsellableReactivationService.ts
import axios from 'axios';
import { Op } from 'sequelize';
import { Merchant } from '../database/models/merchants';
import { Product } from '../database/models/products';
import { IfoodAuthService } from './ifoodAuthService';
import { IfoodCatalogStatusService } from './ifoodCatalogStatusService';

const api = axios.create({
  baseURL: 'https://merchant-api.ifood.com.br/catalog/v2.0',
});

function authHeaders(token: string) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

type Catalog = { catalogId: string; [k: string]: any };

type UnsellableItem = {
  id?: string;
  productId?: string;       // usamos este
  externalCode?: string;    // pode vir, mas não dependemos
  restrictions?: string[];
  categoryId?: string;      // infos úteis p/ debug
  categoryStatus?: string;
  [k: string]: any;
};

export class IfoodUnsellableReactivationService {
  /** Roda para todas as lojas ativas */
  static async runForAllMerchants() {
    const merchants = await Merchant.findAll({
      where: { active: true },
      attributes: ['merchant_id', 'name'],
    });

    const results: Array<Record<string, any>> = [];
    for (const m of merchants) {
      const merchantId = String((m as any).merchant_id);
      try {
        const r = await this.runForMerchant(merchantId);
        results.push({ merchantId, name: (m as any).name, ...r });
      } catch (e: any) {
        results.push({
          merchantId,
          name: (m as any).name,
          error: e?.response?.data || e?.message || 'erro desconhecido',
        });
      }
    }
    return { processed: merchants.length, results };
  }

  /** Roda para uma loja */
  static async runForMerchant(merchantId: string) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);

    // 1) Listar catálogos
    const catalogs = await this.fetchCatalogs(merchantId, access_token);

    // 2) Consolidar unsellables (pegando productId) de todos catálogos
    const productIds = new Set<string>();
    let unsellableCount = 0;

    for (const c of catalogs) {
      const items = await this.fetchUnsellableItems(merchantId, c.catalogId, access_token);
      unsellableCount += items.length;
      for (const it of items) {
        const pid = it.productId;
        if (pid) productIds.add(String(pid));
      }
    }

    if (productIds.size === 0) {
      return {
        catalogs: catalogs.length,
        unsellableCount,
        checkedInventory: 0,
        reenabled: 0,
        skippedDuplicates: 0,
      };
    }

    // 3) Mapear productId -> external_code via seu DB (por loja)
    const dbProducts = await Product.findAll({
      where: {
        merchant_id: merchantId,
        product_id: { [Op.in]: Array.from(productIds) },
      },
      attributes: ['id', 'merchant_id', 'product_id', 'external_code', 'status', 'on_hand'],
    });

    const byProductId = new Map<string, Product>();
    for (const p of dbProducts) {
      // product_id pode ser null, por segurança convertemos para string se existir
      if (p.product_id) byProductId.set(String(p.product_id), p);
    }

    // 4) Para cada productId, consultar inventory no iFood; se amount>0 → candidato a reativar
    const toReenable: { productId: string; externalCode: string }[] = [];
    let checkedInventory = 0;

    // controle simples de concorrência
    const limiter = (pool: Promise<any>[], max: number) => async (fn: () => Promise<any>) => {
      if (pool.length >= max) await Promise.race(pool);
      const p = fn().finally(() => {
        const idx = pool.indexOf(p);
        if (idx >= 0) pool.splice(idx, 1);
      });
      pool.push(p);
      return p;
    };
    const pool: Promise<any>[] = [];
    const run = limiter(pool, 5); // até 5 requests de inventory em paralelo

    const tasks: Promise<void>[] = [];
    for (const pid of productIds) {
      tasks.push(
        run(async () => {
          const prod = byProductId.get(String(pid));
          if (!prod) return; // sem espelho local → ignora

          const inv = await this.fetchInventory(merchantId, String(pid), access_token);
          checkedInventory++;

          const amount = typeof inv?.amount === 'number' ? inv.amount : null;
          if ((amount ?? 0) > 0 && prod.external_code) {
            toReenable.push({ productId: String(pid), externalCode: String(prod.external_code) });
          }
        })
      );
    }
    await Promise.all(tasks);

    if (toReenable.length === 0) {
      return {
        catalogs: catalogs.length,
        unsellableCount,
        checkedInventory,
        reenabled: 0,
        skippedDuplicates: 0,
      };
    }

    // 5) Evitar PATCH ambíguo quando houver mais de um productId para o mesmo externalCode
    const grouped: Record<string, string[]> = {};
    for (const it of toReenable) {
      grouped[it.externalCode] ||= [];
      grouped[it.externalCode].push(it.productId);
    }

    const uniqueExternal: string[] = [];
    let skippedDuplicates = 0;
    for (const [ext, pids] of Object.entries(grouped)) {
      if (pids.length === 1) {
        uniqueExternal.push(ext);
      } else {
        // pula todos os com esse externalCode (não sabemos qual productId “correto”)
        skippedDuplicates += (pids.length - 1);
        console.warn(
          `[unsellable-reactivate] merchant=${merchantId} externalCode duplicado="${ext}" em productIds=${pids.join(',')}. Pulando para evitar PATCH ambíguo.`
        );
      }
    }

    // 6) PATCH em batches e atualizar DB nos SUCCESS
    let reenabled = 0;
    const BATCH = 100;

    for (let i = 0; i < uniqueExternal.length; i += BATCH) {
      const slice = uniqueExternal.slice(i, i + BATCH);
      try {
        const batchRes = await IfoodCatalogStatusService.setStatusForExternalCodes(
          merchantId,
          slice,
          'AVAILABLE',
          access_token
        );

        const successes = Array.isArray(batchRes?.results)
          ? batchRes.results.filter(r => r.result === 'SUCCESS').map(r => String(r.resourceId))
          : [];

        if (successes.length) {
          reenabled += successes.length;
          await Product.update(
            { status: 'AVAILABLE' as any },
            { where: { merchant_id: merchantId, external_code: { [Op.in]: successes } } }
          );
        }
      } catch (e: any) {
        console.error(
          `[unsellable-reactivate] PATCH falhou (merchant=${merchantId} extCodes=${slice.join(',')}):`,
          e?.response?.data || e?.message || e
        );
      }
    }

    return {
      catalogs: catalogs.length,
      unsellableCount,
      checkedInventory,
      reenabled,
      skippedDuplicates,
    };
  }

  // ---------- HTTP helpers ----------

  static async fetchCatalogs(merchantId: string, token: string): Promise<Catalog[]> {
    const { data } = await api.get(`/merchants/${merchantId}/catalogs`, {
      headers: authHeaders(token),
    });
    return Array.isArray(data) ? data : [];
  }

  /**
   * Lida com os dois formatos possíveis:
   *  a) { categories: [{ unsellableItems: [{ productId, ...}] }, ...] }
   *  b) [ { productId, ... }, ... ]  (mais raro)
   */
  static async fetchUnsellableItems(
    merchantId: string,
    catalogId: string,
    token: string
  ): Promise<UnsellableItem[]> {
    const { data } = await api.get(
      `/merchants/${merchantId}/catalogs/${catalogId}/unsellableItems`,
      { headers: authHeaders(token) }
    );

    if (Array.isArray(data)) {
      // formato “flat”
      return data as UnsellableItem[];
    }

    // formato aninhado por categorias
    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const out: UnsellableItem[] = [];

    for (const cat of categories) {
      const list = Array.isArray(cat?.unsellableItems) ? cat.unsellableItems : [];
      for (const u of list) {
        out.push({
          id: u?.id ? String(u.id) : undefined,
          productId: u?.productId ? String(u.productId) : undefined,
          externalCode: u?.externalCode ? String(u.externalCode) : undefined,
          restrictions: Array.isArray(u?.restrictions) ? u.restrictions : undefined,
          categoryId: cat?.id ? String(cat.id) : undefined,
          categoryStatus: cat?.status ? String(cat.status) : undefined,
        });
      }
    }

    return out;
  }

  static async fetchInventory(merchantId: string, productId: string, token: string) {
    const { data } = await api.get(
      `/merchants/${merchantId}/inventory/${productId}`,
      { headers: authHeaders(token) }
    );
    return data;
  }
}
