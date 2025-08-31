// src/services/fetchOrderDetails.ts
import axios from 'axios';

export async function fetchOrderDetails(orderId: string, accessToken: string) {
  const maxRetries = 10;
  const maxTotalTimeMs = 10 * 60 * 1000; // 10 minutos
  const baseDelay = 1000; // 1 segundo

  let attempt = 0;
  let startTime = Date.now();

  while (Date.now() - startTime < maxTotalTimeMs && attempt < maxRetries) {
    try {
      const response = await axios.get(
        `https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );
      console.log(response.data);
      return response.data;
    } catch (error:any) {
      const status = error?.response?.status;
      if (status === 404) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`⚠️ Detalhe do pedido ainda não disponível (404). Retry #${attempt + 1} em ${delay / 1000}s`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } else {
        console.error('❌ Erro ao buscar detalhe do pedido:', error?.response?.data || error.message);
        throw new Error('Erro ao buscar detalhe do pedido');
      }
    }
  }

  throw new Error('Detalhe do pedido não disponível após múltiplas tentativas (timeout)');
}
