// src/services/IfoodUnsellableReactivationService.ts
import axios from 'axios';
import { Op } from 'sequelize';
import { Merchant } from '@db/models/merchants';
import { Product } from '@db/models/products';
import { IfoodAuthService } from '../../authentication/services/ifoodAuthService';
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
  productId?: string;
  externalCode?: string;
  [k: string]: any;
};

export class IfoodUnsellableReactivationService {
  static async runForAllMerchants() {
    const merchants = await Merchant.findAll({
      where: { active: true },
      attributes: ['merchant_id', 'name'],
    });

    const results: any[] = [];
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

  static async runForMerchant(merchantId: string) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);

    // 1) catálogos
    const catalogs = await this.fetchCatalogs(merchantId, access_token);

    // 2) unsellables → set de productIds
    const productIds = new Set<string>();
    let unsellableCount = 0;
    for (const c of catalogs) {
      const items = await this.fetchUnsellableItems(merchantId, c.catalogId, access_token);
      unsellableCount += items.length;
      for (const it of items) if (it.productId) productIds.add(String(it.productId));
    }

    if (productIds.size === 0) {
      return {
        catalogs: catalogs.length,
        unsellableCount,
        checkedInventory: 0,
        reenabled: 0,
        skippedDuplicates: 0,
        skippedLocalAvailable: 0,
      };
    }

    // 3) mapear productId -> product local
    const dbProducts = await Product.findAll({
      where: { merchant_id: merchantId, product_id: { [Op.in]: Array.from(productIds) } },
      attributes: ['id', 'merchant_id', 'product_id', 'external_code', 'status', 'on_hand'],
    });

    const byProductId = new Map<string, Product>();
    for (const p of dbProducts) byProductId.set(String(p.product_id), p);

    // 4) checar inventory e montar candidatos
    const toReenable: { productId: string; externalCode: string }[] = [];
    let checkedInventory = 0;
    let skippedLocalAvailable = 0;

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
    const run = limiter(pool, 5);

    const tasks: Promise<void>[] = [];
    for (const pid of productIds) {
      tasks.push(
        run(async () => {
          const prod = byProductId.get(String(pid));
          if (!prod) return;

          // 🚫 não reativar se local já está AVAILABLE
          if ((prod.status || '').toUpperCase() === 'AVAILABLE') {
            skippedLocalAvailable++;
            return;
          }

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
        skippedLocalAvailable,
      };
    }

    // 5) dedupe por externalCode e guardar o mapeamento ext->pid (para refresh do estoque depois)
    const grouped: Record<string, string[]> = {};
    for (const it of toReenable) {
      grouped[it.externalCode] ||= [];
      grouped[it.externalCode].push(it.productId);
    }

    const uniqueExternal: string[] = [];
    const extToPid: Record<string, string> = {};
    let skippedDuplicates = 0;

    for (const [ext, pids] of Object.entries(grouped)) {
      if (pids.length === 1) {
        uniqueExternal.push(ext);
        extToPid[ext] = pids[0];
      } else {
        skippedDuplicates += pids.length;
        console.warn(
          `[unsellable-reactivate] merchant=${merchantId} externalCode duplicado="${ext}" em productIds=${pids.join(',')}. Pulando para evitar ambiguidade no PATCH.`
        );
      }
    }

    // 6) PATCH AVAILABLE (batches) + atualizar DB e on_hand com inventory atualizado
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

          // status local → AVAILABLE
          await Product.update(
            { status: 'AVAILABLE' as any },
            { where: { merchant_id: merchantId, external_code: { [Op.in]: successes } } }
          );

          // 🔄 refresh do estoque (inventory) para cada sucesso e atualizar on_hand
          await this.refreshInventoryForSuccesses(merchantId, successes, extToPid, access_token);
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
      skippedLocalAvailable,
    };
  }

  // ---------- helpers HTTP ----------

  static async fetchCatalogs(merchantId: string, token: string): Promise<Catalog[]> {
    const { data } = await api.get(`/merchants/${merchantId}/catalogs`, { headers: authHeaders(token) });
    return Array.isArray(data) ? data : [];
  }

  static async fetchUnsellableItems(
    merchantId: string,
    catalogId: string,
    token: string
  ): Promise<UnsellableItem[]> {
    const { data } = await api.get(
      `/merchants/${merchantId}/catalogs/${catalogId}/unsellableItems`,
      { headers: authHeaders(token) }
    );

    // formato esperado: { categories: [{ unsellableItems: [...] }, ...] }
    if (!data || !Array.isArray(data.categories)) return [];
    const flat: UnsellableItem[] = [];
    for (const cat of data.categories) {
      const arr = Array.isArray(cat?.unsellableItems) ? cat.unsellableItems : [];
      for (const it of arr) flat.push({ productId: it?.productId, externalCode: it?.externalCode });
    }
    return flat;
  }

  static async fetchInventory(merchantId: string, productId: string, token: string) {
    const { data } = await api.get(
      `/merchants/${merchantId}/inventory/${productId}`,
      { headers: authHeaders(token) }
    );
    return data; // { amount: number, ... }
  }

  // ---------- pós-reativação: atualizar on_hand a partir do inventory ----------
  private static async refreshInventoryForSuccesses(
    merchantId: string,
    externalCodes: string[],
    extToPid: Record<string, string>,
    token: string
  ) {
    const pool: Promise<any>[] = [];
    const run = (fn: () => Promise<any>) => {
      if (pool.length >= 5) {
        return Promise.race(pool).then(() => {
          const p = fn().finally(() => {
            const idx = pool.indexOf(p);
            if (idx >= 0) pool.splice(idx, 1);
          });
          pool.push(p);
          return p;
        });
      }
      const p = fn().finally(() => {
        const idx = pool.indexOf(p);
        if (idx >= 0) pool.splice(idx, 1);
      });
      pool.push(p);
      return p;
    };

    const tasks = externalCodes.map(ext =>
      run(async () => {
        const pid = extToPid[ext];
        if (!pid) return;

        try {
          const inv = await this.fetchInventory(merchantId, pid, token);
          const amount = typeof inv?.amount === 'number' ? inv.amount : null;

          if (amount != null) {
            await Product.update(
              { on_hand: amount as any }, // se on_hand for INT e amount vier decimal, ajuste aqui (Math.trunc/round)
              { where: { merchant_id: merchantId, external_code: ext } }
            );
          }
        } catch (e: any) {
          console.warn(`[unsellable-reactivate] refreshInventory falhou (merchant=${merchantId}, ext=${ext}, pid=${pid}):`,
            e?.response?.data || e?.message || e);
        }
      })
    );

    await Promise.all(tasks);
  }
}
