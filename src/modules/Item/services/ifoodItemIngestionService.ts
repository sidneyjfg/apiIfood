import axios from 'axios';
import { IfoodAuthService } from '@modules/authentication/services/ifoodAuthService';

const BASE_URL = process.env.IFOOD_BASE_URL ?? 'https://merchant-api.ifood.com.br';

// use um timeout maior porque ingestion pode ser pesada
const http = axios.create({ baseURL: BASE_URL, timeout: 30000 });

export const IfoodItemIngestionService = {
  /**
   * POST /item/v1.0/ingestion/{merchantId}?reset=false
   * Envia o catálogo (itens) completo ou parcial para (re)ingestão/reativação.
   * - reset=false: mantém vínculos e atualiza/reativa itens conforme payload
   * - reset=true : (cuidado) efetua “reset” conforme expectativa da sua operação
   */
  async postIngestion(merchantId: string, payload: any, reset = false) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await http.post(
      `/item/v1.0/ingestion/${merchantId}`,
      payload, // iFood ingestion body (array/obj conforme docs)
      {
        headers: { Authorization: `Bearer ${access_token}` },
        params: { reset: String(!!reset) },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );
    return data; // normalmente retorna batchId ou summary
  },

  /**
   * PATCH /item/v1.0/ingestion/{merchantId}
   * Alterações parciais: preços, nomes, descrições, vínculos de category/option etc. (conforme doc de ingestion).
   */
  async patchIngestion(merchantId: string, payload: any) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await http.patch(
      `/item/v1.0/ingestion/${merchantId}`,
      payload,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );
    return data;
  },
};
