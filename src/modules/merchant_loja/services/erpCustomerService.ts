// src/modules/merchant/services/erpCustomerService.ts
import axios from 'axios';
import { MerchantErpMapping } from '@db/models/MerchantErpMapping';
import { ErpLocation } from '@db/models';

type Pessoa = 'PF' | 'PJ' | 'ES';

export interface EnsureCustomerParams {
  merchantId: string;
  order: any; // objeto do fetchOrderDetails
}

export class ErpCustomerService {
  private static normalizeDigits(v?: string) {
    return (v || '').replace(/\D+/g, '');
  }

  private static guessTipoPessoa(cpfCnpj?: string): Pessoa {
    const d = this.normalizeDigits(cpfCnpj);
    if (d.length === 14) return 'PJ';
    if (d.length === 11) return 'PF';
    return 'ES';
  }

  // Busca 1x o "usuário administrador" para atribuição (opcional)
  static async getAdminUserId(): Promise<string | undefined> {
    const baseUrl = (process.env.BASE_URL_ERP || '').replace(/\/+$/, '');
    if (!baseUrl) return undefined;
    const token = process.env.ERP_API_TOKEN || '';
    try {
      const resp = await axios.get(`${baseUrl}/api/usuarios/`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 12000,
        validateStatus: () => true,
      });
      const list = Array.isArray(resp.data) ? resp.data : [];
      // heurística simples: primeiro com perfil admin ou o primeiro da lista
      const admin =
        list.find((u: any) =>
          String(u?.perfil || u?.role || '').toLowerCase().includes('admin')
        ) || list[0];
      return admin?.id?.toString();
    } catch {
      return undefined;
    }
  }

  // Tenta localizar cliente existente. Ideal: filtrar por documento; fallback: nome+telefone.
  static async findExistingCustomer(params: {
    document?: string;
    name?: string;
    phone?: string;
  }): Promise<any | null> {
    const baseUrl = (process.env.BASE_URL_ERP || '').replace(/\/+$/, '');
    if (!baseUrl) return null;
    const token = process.env.ERP_API_TOKEN || '';
    const docDigits = this.normalizeDigits(params.document);

    // Se a API suportar querystring, você pode trocar por ?document=...&nome=...
    const resp = await axios.get(`${baseUrl}/clientes`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    const items: any[] = Array.isArray(resp.data) ? resp.data : [];
    if (!items.length) return null;

    // 1) por documento
    if (docDigits) {
      const byDoc =
        items.find((c: any) => this.normalizeDigits(c?.cpfCnpj || c?.documento) === docDigits) ||
        null;
      if (byDoc) return byDoc;
    }

    // 2) fallback por nome + telefone
    const nameNorm = (params.name || '').trim().toLowerCase();
    const phoneDigits = this.normalizeDigits(params.phone);
    if (!nameNorm) return null;
    const byNamePhone =
      items.find((c: any) => {
        const n = String(c?.nome || c?.name || '').trim().toLowerCase();
        const p = this.normalizeDigits(c?.telefone || c?.phone);
        return n === nameNorm && (!phoneDigits || p === phoneDigits);
      }) || null;

    return byNamePhone;
  }

  // Retorna o { clienteId, cliente } pronto para usar na venda
  static async ensureCustomerForOrder({ merchantId, order }: EnsureCustomerParams) {
    const baseUrl = (process.env.BASE_URL_ERP || '').replace(/\/+$/, '');
    if (!baseUrl) return { created: false, clienteId: undefined, cliente: null };

    // dados do pedido iFood
    const cust = order?.customer || {};
    const nome =
      cust?.name ||
      [cust?.firstName, cust?.lastName].filter(Boolean).join(' ') ||
      'Consumidor iFood';
    const cpfCnpj = cust?.taxPayerId || cust?.documentNumber || '';
    const telefone =
      cust?.phone?.number ||
      cust?.phones?.[0]?.number ||
      order?.delivery?.deliveryAddress?.contact?.phone ||
      '';

    // loja (mapeada pelo merchant)
    const mapping = await MerchantErpMapping.findOne({ where: { merchant_id: merchantId } });
    if (!mapping) {
      console.warn(`⚠️ Sem MerchantErpMapping para merchant_id=${merchantId} (cliente).`);
      return { created: false, clienteId: undefined, cliente: null };
    }
    const erpLoc = await ErpLocation.findOne({ where: { id: mapping.erp_location_id } });
    const loja_id = mapping.erp_location_id; // já mapeado

    // 1) tentar achar existente
    const existing = await this.findExistingCustomer({
      document: cpfCnpj,
      name: nome,
      phone: telefone,
    });
    if (existing?.id) {
      return { created: false, clienteId: String(existing.id), cliente: existing };
    }

    // 2) criar
    const token = process.env.ERP_API_TOKEN || '';
    const usuario_id = await this.getAdminUserId().catch(() => undefined);
    const tipo_pessoa: Pessoa = this.guessTipoPessoa(cpfCnpj);

    const payload: any = {
      tipo_pessoa: tipo_pessoa,  // 'PF' | 'PJ' | 'ES'
      nome,
      ...(usuario_id ? { usuario_id } : {}),
      ...(loja_id ? { loja_id } : {}),
      // se o ERP aceitar esses campos, já envie:
      ...(cpfCnpj ? { cpfCnpj } : {}),
      ...(telefone ? { telefone } : {}),
    };

    const resp = await axios.post(`${baseUrl}/clientes`, payload, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (resp.status >= 200 && resp.status < 300 && resp.data?.id) {
      return { created: true, clienteId: String(resp.data.id), cliente: resp.data };
    }

    console.warn('⚠️ Falha ao criar cliente no ERP:', resp.status, resp.data);
    return { created: false, clienteId: undefined, cliente: null };
  }
}
