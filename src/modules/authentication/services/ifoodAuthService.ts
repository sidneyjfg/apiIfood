import axios from 'axios';
import { AuthToken } from '@db/models/auth_tokens';
import { Op, UniqueConstraintError } from 'sequelize';

export class IfoodAuthService {
    static async getAccessToken(merchantId: string): Promise<{
        message: string;
        access_token: string;
        expires_in: number;
    }> {
        const now = new Date();

        // 1) Reutiliza token válido da loja
        const existing = await AuthToken.findOne({
            where: { merchant_id: merchantId, provider: 'IFOOD', expires_at: { [Op.gt]: now } },
            order: [['created_at', 'DESC']],
        });
        if (existing) {
            const timeLeft = Math.max(0, Math.floor((existing.expires_at.getTime() - Date.now()) / 1000));
            return { message: 'Token reutilizado com sucesso', access_token: existing.access_token, expires_in: timeLeft };
        }

        // 2) Solicita novo token ao iFood
        const { IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET } = process.env;
        const payload = new URLSearchParams();
        payload.append('grantType', 'client_credentials');
        payload.append('clientId', IFOOD_CLIENT_ID || '');
        payload.append('clientSecret', IFOOD_CLIENT_SECRET || '');

        const resp = await axios.post(
            'https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token',
            payload.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
        );
        console.log('➡️ Resposta do iFood:', resp.status, resp.data);

        const { accessToken, refreshToken, expiresIn } = resp.data || {};
        if (!accessToken || !expiresIn) throw new Error('Token não retornado pela API do iFood');

        // margem de 60s pra evitar pegar token “na bica de expirar”
        const expires_at = new Date(Date.now() + (Number(expiresIn) - 60) * 1000);

        // 3) Salva como upsert (idempotente por UNIQUE merchant+provider)
        try {
            await AuthToken.upsert({
                merchant_id: merchantId,
                provider: 'IFOOD',
                access_token: accessToken,
                refresh_token: refreshToken ?? null,
                expires_at,
                created_at: new Date(),
            } as any);
        } catch (e: any) {
            // corrida: outra thread inseriu agora — leia o registro e use
            if (e instanceof UniqueConstraintError) {
                const latest = await AuthToken.findOne({
                    where: { merchant_id: merchantId, provider: 'IFOOD' },
                    order: [['created_at', 'DESC']],
                });
                if (latest) {
                    const timeLeft = Math.max(0, Math.floor((latest.expires_at.getTime() - Date.now()) / 1000));
                    return { message: 'Token reutilizado (race)', access_token: latest.access_token, expires_in: timeLeft };
                }
            }
            console.error('❌ Sequelize ao salvar token:', e?.errors?.map((x: any) => x.message) || e.message);
            throw new Error('Falha ao persistir token do iFood');
        }

        return { message: 'Token gerado com sucesso', access_token: accessToken, expires_in: Number(expiresIn) };
    }

    /**
     * Pode ser usado futuramente para fazer renovação com refresh_token, se necessário.
     */
    static async refreshAccessToken(merchantId: string, refresh_token: string): Promise<string> {
        const payload = new URLSearchParams();
        payload.append('grantType', 'refresh_token');
        payload.append('clientId', process.env.IFOOD_CLIENT_ID || '');
        payload.append('clientSecret', process.env.IFOOD_CLIENT_SECRET || '');
        payload.append('refreshToken', refresh_token);

        try {
            const response = await axios.post(
                'https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token',
                payload.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                    },
                }
            );

            const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;
            const expires_at = new Date(Date.now() + expires_in * 1000);

            await AuthToken.create({
                merchant_id: merchantId,                         // 🔧 loja
                provider: 'IFOOD',
                access_token,
                refresh_token: newRefreshToken || refresh_token,
                expires_at,
            });

            return access_token;
        } catch (error: any) {
            console.error('Erro ao renovar token:', error?.response?.data || error.message);
            throw new Error('Falha ao renovar token do iFood');
        }
    }
}
