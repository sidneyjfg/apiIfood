import axios from 'axios';
import { AuthToken } from '../database/models/auth_tokens';
import { Op } from 'sequelize';

export class IfoodAuthService {
    static async getAccessToken(): Promise<{
        message: string;
        access_token: string;
        expires_in: number;
    }> {
        const now = new Date();

        // 1. Verificar token válido salvo no banco
        const existingToken = await AuthToken.findOne({
            where: {
                provider: 'IFOOD',
                expires_at: { [Op.gt]: now }
            },
            order: [['created_at', 'DESC']]
        });

        if (existingToken) {
            const timeLeft = Math.floor((existingToken.expires_at.getTime() - Date.now()) / 1000);
            return {
                message: 'Token reutilizado com sucesso',
                access_token: existingToken.access_token,
                expires_in: timeLeft,
            };
        }

        // 2. Caso não exista, autenticar com grant_type client_credentials
        const { IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET } = process.env;

        const payload = new URLSearchParams();
        payload.append('grantType', 'client_credentials');
        payload.append('clientId', IFOOD_CLIENT_ID || '');
        payload.append('clientSecret', IFOOD_CLIENT_SECRET || '');

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
            console.log('➡️ Resposta do iFood:', response.status, response.data);

            const { accessToken, refreshToken, expiresIn } = response.data;

            if (!accessToken) {
                throw new Error('Token não retornado pela API do iFood');
            }

            const expires_at = new Date(Date.now() + expiresIn * 1000);

            // Salvar no banco
            await AuthToken.create({
                provider: 'IFOOD',
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at,
            });

            return {
                message: 'Token gerado com sucesso',
                access_token: accessToken,
                expires_in: expiresIn
            };
        } catch (error:any) {
            const status = error?.response?.status;
            const data = error?.response?.data;

            if (status === 401) {
                console.error('🔒 Erro 401 - Token ou credenciais inválidas:', data);
                throw new Error('Token inválido ou credenciais incorretas. Verifique sua configuração.');
            }

            console.error('❌ Erro ao obter token do iFood:', data || error.message);
            throw new Error('Falha ao autenticar com o iFood');
        }

    }

    /**
     * Pode ser usado futuramente para fazer renovação com refresh_token, se necessário.
     */
    static async refreshAccessToken(refresh_token: string): Promise<string> {
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
                provider: 'IFOOD',
                access_token,
                refresh_token: newRefreshToken || refresh_token,
                expires_at,
            });

            return access_token;
        } catch (error:any) {
            console.error('Erro ao renovar token:', error?.response?.data || error.message);
            throw new Error('Falha ao renovar token do iFood');
        }
    }
}
