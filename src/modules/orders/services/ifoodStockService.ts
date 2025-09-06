// services/ifoodStockService.ts
import axios from 'axios';
import { controlsIfoodStockInERP } from '@core/utils/featureFlags';

export async function updateIfoodStock(
  merchantId: string,
  productId: string,
  amount: number,
  accessToken: string
): Promise<boolean> {
  // 🔕 Feature flag: skip publishing inventory to iFood
  if (controlsIfoodStockInERP()) {
    console.log(
      `🔕 [CONTROLA_IFOOD_ESTOQUE=1] PULANDO atualização de estoque no iFood (merchantId=${merchantId}, productId=${productId}, amount=${amount}).`,
    );
    return true; // Considered "ok" from the caller perspective
  }

  try {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/inventory`;
    const payload = { productId, amount };
    const { status } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 12000,
      validateStatus: () => true,
    });

    if (status >= 200 && status < 300) {
      console.log(`✅ Estoque atualizado no iFood (productId=${productId}): ${amount}`);
      return true;
    }
    console.error(`❌ Falha ao atualizar estoque (status ${status})`);
    return false;
  } catch (error: any) {
    const status = error?.response?.status ?? '???';
    const data = error?.response?.data ?? error?.message;
    console.error(`❌ Erro ao atualizar estoque (status ${status}):`, data);
    return false;
  }
}
