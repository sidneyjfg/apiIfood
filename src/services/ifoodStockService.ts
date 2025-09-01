// services/ifoodStockService.ts
import axios from 'axios';

export async function updateIfoodStock(
  merchantId: string,
  productId: string,
  amount: number,
  accessToken: string
): Promise<boolean> {
  try {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/inventory`;
    const payload = {
      productId,
      amount
    };
    const { status } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
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
