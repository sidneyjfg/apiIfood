// src/modules/orders/services/ifoodOrderActionsService.ts
import axios from 'axios';
import { IfoodAuthService } from '@modules/authentication/services/ifoodAuthService';
import { runWithRateLimit, retry } from '@core/utils/httpResilience'; // <- inclui retry também

const RAW_BASE_URL = process.env.IFOOD_BASE_URL ?? 'https://merchant-api.ifood.com.br';
const BASE_URL = RAW_BASE_URL.replace(/\/$/, '');

export class IfoodOrderActionsService {
  private static http = axios.create({
    baseURL: BASE_URL,
    timeout: Number(process.env.IFOOD_HTTP_TIMEOUT_MS ?? 15000),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  /** wrapper: RL + retry */
  private static async call<T>(
    merchantId: string,
    action: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const key = `IFOOD:${merchantId}:${action}`;
    return runWithRateLimit(
      key,
      {
        maxPerWindow: Number(process.env.IFOOD_RATE_MAX ?? 10),
        intervalMs: Number(process.env.IFOOD_RATE_WINDOW_MS ?? 1000),
      },
      () => retry(fn, Number(process.env.IFOOD_HTTP_MAX_ATTEMPTS ?? 4))
    );
  }

  /** Lista motivos de cancelamento para um pedido específico (mostrar no PDV) */
  static async getCancellationReasons(merchantId: string, orderId: string) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    return this.call(merchantId, 'cancellationReasons', async () => {
      const { data } = await this.http.get(
        `/orders/v1.0/${orderId}/cancellationReasons`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      return data;
    });
  }

  /** Cancela pedido informando o motivo selecionado no PDV */
  static async cancelOrder(
    merchantId: string,
    orderId: string,
    reasonId: string,
    comment?: string
  ) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const payload: any = { reason: reasonId };
    if (comment) payload.comment = comment;

    return this.call(merchantId, 'cancel', async () => {
      const { data } = await this.http.post(
        `/orders/v1.0/${orderId}/cancellation`,
        payload,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      return data;
    });
  }

  /** TAKEOUT: marcar como pronto para retirada (ready) */
  static async markReadyForPickup(merchantId: string, orderId: string) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    return this.call(merchantId, 'ready', async () => {
      const { data } = await this.http.post(
        `/orders/v1.0/${orderId}/ready`,
        {},
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      return data;
    });
  }

  /** CONFIRMAR pedido (requisito de homologação FOOD) */
  static async confirmOrder(merchantId: string, orderId: string) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    return this.call(merchantId, 'confirm', async () => {
      const { data } = await this.http.post(
        `/orders/v1.0/${orderId}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      return data;
    });
  }

  /** DESPACHAR pedido (delivery) */
  static async dispatchOrder(merchantId: string, orderId: string) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    return this.call(merchantId, 'dispatch', async () => {
      const { data } = await this.http.post(
        `/orders/v1.0/${orderId}/dispatch`,
        {},
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      return data;
    });
  }
}

export default IfoodOrderActionsService;
