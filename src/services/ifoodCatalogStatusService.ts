// src/services/ifoodCatalogStatusService.ts
import axios from 'axios';
import { Product } from '../database/models/products';

const api = axios.create({
  baseURL: 'https://merchant-api.ifood.com.br/catalog/v2.0/',
});

function authHeaders(token: string) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

type StatusValue = 'AVAILABLE' | 'UNAVAILABLE';

// Tipos auxiliares para o batch do iFood
type BatchItemResult = { resourceId: string; result: string };
type PatchBatchResp = { batchId: string; url: string };
type BatchStatusResp = { batchStatus: string; results?: BatchItemResult[] };

export class IfoodCatalogStatusService {
  static async patchStatuses(
    merchantId: string,
    items: Array<{ externalCode: string; status: StatusValue }>,
    accessToken: string
  ): Promise<PatchBatchResp> {
    const { data } = await api.patch(
      `/merchants/${merchantId}/products/status`,
      items,
      { headers: authHeaders(accessToken) }
    );

    const absoluteUrl =
      data?.url?.startsWith('http')
        ? data.url
        : `https://merchant-api.ifood.com.br/catalog/v2.0${data?.url || ''}`;

    return { batchId: data.batchId, url: absoluteUrl };
  }

  static async getBatch(
    merchantId: string,
    batchId: string,
    accessToken: string
  ): Promise<BatchStatusResp> {
    const { data } = await api.get(
      `/merchants/${merchantId}/batch/${batchId}`,
      { headers: authHeaders(accessToken) }
    );
    return data as BatchStatusResp;
  }

  static async waitForBatchComplete(
    merchantId: string,
    batchId: string,
    accessToken: string,
    opts: { maxTries?: number; delayMs?: number } = {}
  ): Promise<BatchStatusResp> {
    const maxTries = opts.maxTries ?? 12;
    const delayMs  = opts.delayMs  ?? 5000;

    for (let i = 0; i < maxTries; i++) {
      const data = await this.getBatch(merchantId, batchId, accessToken);
      if (data.batchStatus === 'COMPLETED' || data.batchStatus === 'FAILED') {
        return data;
      }
      // ✅ tipar o resolve para não cair no noImplicitAny
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
    return { batchStatus: 'TIMEOUT' };
  }

  static async setStatusForExternalCodes(
    merchantId: string,
    externalCodes: string[],
    status: StatusValue,
    accessToken: string
  ): Promise<BatchStatusResp> {
    const payload = externalCodes.map((ec) => ({ externalCode: ec, status }));
    const { batchId } = await this.patchStatuses(merchantId, payload, accessToken);
    const result = await this.waitForBatchComplete(merchantId, batchId, accessToken);
    return result;
  }

  /** Decide status com base no AVAILABLE calculado */
  static async ensureStatusByAvailability(
    merchantId: string,
    product: Product,
    available: number,
    accessToken: string
  ) {
    const desired: StatusValue = available > 0 ? 'AVAILABLE' : 'UNAVAILABLE';

    if (product.status === desired) return { changed: false, desired };

    const external = product.external_code;
    if (!external) return { changed: false, desired, reason: 'no-external_code' };

    const batch = await this.setStatusForExternalCodes(merchantId, [external], desired, accessToken);

    // ✅ tipar o item do some(...)
    const ok = Array.isArray(batch?.results)
      ? batch.results.some((r: BatchItemResult) => r.resourceId === external && r.result === 'SUCCESS')
      : false;

    if (ok) {
      await product.update({ status: desired });
      return { changed: true, desired };
    }

    return { changed: false, desired, batchStatus: batch?.batchStatus, results: batch?.results };
  }
}
