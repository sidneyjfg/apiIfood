import axios from 'axios';

export async function updateIfoodStock(
    merchantId: string,
    productId: string,
    amount: number,
    accessToken: string
) {
    try {
        await axios.patch(
            `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/inventory`,
            [{ productId, amount }],
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log(`✅ Estoque atualizado no iFood para ${productId}: ${amount}`);
    } catch (error: any) {
        if (error instanceof Error) {
            console.error(`❌ Erro ao atualizar estoque: ${error.message}`);
        } else {
            console.error(`❌ Erro desconhecido ao atualizar estoque`, error);
        }
    }
}
