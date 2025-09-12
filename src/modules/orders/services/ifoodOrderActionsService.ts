import axios from 'axios';
import { IfoodAuthService } from '@modules/authentication/services/ifoodAuthService';

const BASE_URL = process.env.IFOOD_BASE_URL ?? 'https://merchant-api.ifood.com.br';

export class IfoodOrderActionsService {
  private static http = axios.create({ baseURL: BASE_URL, timeout: 15000 });

  /** Lista motivos de cancelamento para um pedido específico (mostrar no PDV) */
  static async getCancellationReasons(merchantId: string, orderId: string) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await this.http.get(
      `/orders/v1.0/${orderId}/cancellationReasons`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    return data; // [{ id, description, ... }]
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

    const { data } = await this.http.post(
      `/orders/v1.0/${orderId}/cancellation`,
      payload,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    return data;
  }

  /** TAKEOUT: marcar como pronto para retirada (ready) */
  static async markReadyForPickup(merchantId: string, orderId: string) {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
    const { data } = await this.http.post(
      `/orders/v1.0/${orderId}/ready`,
      {},
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    return data;
  }
}
