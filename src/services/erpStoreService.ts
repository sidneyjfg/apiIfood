// src/services/erpStoreService.ts
import axios from 'axios';
import { sequelize } from '../config/database';
import { ErpLocation } from '../database/models/ErpLocation';

type ErpStoreDTO = {
  id: string;        // id/código único do ERP
  code?: string;     // se o ERP já tem code; senão usamos id
  name?: string;
  active?: boolean;
};

export class ErpStoreService {
  /**
   * Busca todas as lojas no ERP e faz upsert em erp_locations.
   * - GET ${ERP_BASE_URL}/stores
   * - header Authorization: Bearer <token opcional>
   */
  static async syncErpStores(): Promise<{ total: number; upserts: number; items: ErpStoreDTO[] }> {
    const baseUrl = process.env.ERP_BASE_URL!;
    const token   = process.env.ERP_API_TOKEN; // se precisar
    const url     = `${baseUrl.replace(/\/+$/, '')}/stores`;

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
}
