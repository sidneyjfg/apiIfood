import axios from 'axios';
import FormData from 'form-data';
import { IfoodAuthService } from '@modules/authentication/services/ifoodAuthService';

const BASE_URL = process.env.IFOOD_BASE_URL ?? 'https://merchant-api.ifood.com.br';
const http = axios.create({ baseURL: BASE_URL, timeout: 20000 });

type PricePatch = {
  merchantId: string;
  items: Array<{ externalCode: string; price: number }>;
};

type StatusPatch = {
  merchantId: string;
  items: Array<{ externalCode: string; status: 'AVAILABLE' | 'UNAVAILABLE' }>;
};

type OptionPricePatch = {
  merchantId: string;
  options: Array<{ externalCode: string; price: number }>;
};

type OptionStatusPatch = {
  merchantId: string;
  options: Array<{ externalCode: string; status: 'AVAILABLE' | 'UNAVAILABLE' }>;
};

export const IfoodCatalogService = {
  // -------- Catalogs & Categories --------
  async listCatalogs(merchantId: string) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await http.get(`/catalog/v2.0/merchants/${merchantId}/catalogs`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    return data;
  },

  async listCategories(merchantId: string, catalogId: string, includeItems = false) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await http.get(
      `/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        params: { includeItems: includeItems ? 'true' : 'false' },
      }
    );
    return data;
  },

  async createCategory(merchantId: string, catalogId: string, payload: any) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await http.post(
      `/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`,
      payload,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    return data;
  },

  // -------- Items --------
  // PUT item completo (cria/edita)
  async putItem(merchantId: string, itemPayload: any) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await http.put(
      `/catalog/v2.0/merchants/${merchantId}/items`,
      itemPayload,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    return data;
  },

  // PATCH preço dos itens
  async patchItemsPrice({ merchantId, items }: PricePatch) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await http.patch(
      `/catalog/v2.0/merchants/${merchantId}/items/price`,
      { items },
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    return data;
  },

  // PATCH status dos itens (AVAILABLE/UNAVAILABLE)
  async patchItemsStatus({ merchantId, items }: StatusPatch) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await http.patch(
      `/catalog/v2.0/merchants/${merchantId}/items/status`,
      { items },
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    return data;
  },

  // -------- Options (complementos) --------
  async patchOptionsPrice({ merchantId, options }: OptionPricePatch) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await http.patch(
      `/catalog/v2.0/merchants/${merchantId}/options/price`,
      { options },
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    return data;
  },

  async patchOptionsStatus({ merchantId, options }: OptionStatusPatch) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await http.patch(
      `/catalog/v2.0/merchants/${merchantId}/options/status`,
      { options },
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    return data;
  },

  // -------- Imagens --------
  /**
   * Upload de imagem do item.
   * Suporta:
   *  - req.file (se usar multer) → buffer + originalname + mimetype
   *  - imageBase64 (string) + filename + contentType
   */
  async uploadImage(merchantId: string, args: {
    fileBuffer?: Buffer;
    filename?: string;
    contentType?: string;
    imageBase64?: string; // alternativa ao fileBuffer
  }) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);

    let buffer: Buffer | undefined = args.fileBuffer;
    let filename = args.filename ?? 'upload.jpg';
    let contentType = args.contentType ?? 'image/jpeg';

    if (!buffer && args.imageBase64) {
      const commaIdx = args.imageBase64.indexOf(',');
      const pure = commaIdx > -1 ? args.imageBase64.slice(commaIdx + 1) : args.imageBase64;
      buffer = Buffer.from(pure, 'base64');
    }
    if (!buffer) throw new Error('Nenhum arquivo fornecido (fileBuffer ou imageBase64).');

    const form = new FormData();
    form.append('file', buffer, { filename, contentType });

    const { data } = await http.post(
      `/catalog/v2.0/merchants/${merchantId}/image/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${access_token}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );
    return data; // deve retornar id/url da imagem no iFood
  },
};
