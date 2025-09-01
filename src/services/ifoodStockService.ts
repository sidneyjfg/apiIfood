import axios from 'axios';

export async function updateIfoodStock(
    merchantId: string,
    productId: string,
    amount: number,
    accessToken: string
) {
    try {
        const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/inventory`;

        const payload = {
            productId,
            amount
        };

        await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });

        console.log(`✅ Estoque atualizado no iFood (productId=${productId}): ${amount}`);
        return true;
    } catch (error: any) {
        const status = error?.response?.status;
        const data = error?.response?.data;

        if (status === 404) {
            console.error(
                `❌ 404 ao atualizar estoque: verifique se productId pertence a um Product no catálogo v2 e se o merchantId está correto. Detalhes:`,
                data
            );
        } else {
            console.error(`❌ Erro ao atualizar estoque (status ${status ?? '???'}):`, data ?? error.message);
        }
        return false;
    }
}
