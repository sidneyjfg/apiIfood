// src/services/ifoodMerchantService.ts
import axios from 'axios';
import { sequelize } from '../config/database';
import { Merchant } from '../database/models/merchants';
import { UserIfoodAuthService } from './ifoodUserAuthService';

type IfoodMerchant = {
  id: string;
  name?: string;
  corporateName?: string;  // da API (camelCase)
  corporate_name?: string; // raríssimo, mas deixamos como fallback
};

export class IfoodMerchantService {
  static async listMerchants(accessToken: string, page = 1, size = 100): Promise<IfoodMerchant[]> {
    const url = `https://merchant-api.ifood.com.br/merchant/v1.0/merchants?page=${page}&size=${size}`;
    const resp = await axios.get(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    });

    const data = resp.data;
    console.log(`[iFood] GET /merchants status=${resp.status} arr=${Array.isArray(data)} count=${Array.isArray(data) ? data.length : 'n/a'}`);

    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      console.log('[iFood] sample:', {
        id: first?.id,
        name: first?.name,
        corporateName: first?.corporateName,
      });
    }

    return Array.isArray(data) ? (data as IfoodMerchant[]) : [];
  }

  /**
   * Busca as lojas no iFood (usando credenciais de user_api_ifood)
   * e faz upsert em `merchants` mapeando corporateName -> corporate_name.
   */
  static async syncMerchantsToDB(page = 1, size = 100) {
    const accessToken = await UserIfoodAuthService.getAccessToken();

    const merchants = await this.listMerchants(accessToken, page, size);
    console.log(`[Sync] Recebidos ${merchants.length} merchants (page=${page}, size=${size}).`);

    let upserts = 0;

    await sequelize.transaction(async (t) => {
      for (const m of merchants) {
        // normaliza: usa corporateName da API; se não vier, tenta corporate_name; se não, null
        const corp = (m.corporateName ?? (m as any).corporate_name ?? null) as string | null;

        const payload: any = {
          merchant_id: m.id,
          name: m.name ?? corp ?? m.id,
          corporate_name: corp,    // <<<<<< mapeamento definitivo
          active: true,
        };

        console.log('[Sync] Upsert merchant:', payload);

        await Merchant.upsert(payload, { transaction: t });
        upserts++;
      }
    });

    const items = merchants.map((m) => {
      const corp = (m.corporateName ?? (m as any).corporate_name ?? null) as string | null;
      return {
        id: m.id,
        name: m.name ?? corp ?? m.id,
        corporateName: corp, // resposta em camelCase para o front
      };
    });

    console.log(`[Sync] Upserts: ${upserts}/${merchants.length}`);
    return { page, size, total: items.length, upserts, items };
  }
}
