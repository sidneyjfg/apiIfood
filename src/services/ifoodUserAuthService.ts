import axios from 'axios';
import { Op } from 'sequelize';
import { UserApiIfood } from '../database/models/userApiIfood';

export class UserIfoodAuthService {
  /**
   * Lê as credenciais do primeiro registro de user_api_ifood
   * (ou você pode selecionar por ID depois) e retorna um access token válido.
   * Atualiza access_token/refresh_token/expires_at na própria tabela.
   */
  static async getAccessToken(): Promise<string> {
    const cred = await UserApiIfood.findOne({ order: [['id', 'ASC']] });
    if (!cred) throw new Error('Credenciais não encontradas em user_api_ifood');

    // se já tem token válido, reutiliza
    if (cred.expires_at && cred.access_token) {
      const secs = (cred.expires_at.getTime() - Date.now()) / 1000;
      if (secs > 60) return cred.access_token; // margem de 1 min
    }

    const payload = new URLSearchParams();
    payload.append('grantType', 'client_credentials');
    payload.append('clientId', cred.client_id);
    payload.append('clientSecret', cred.client_secret);

    const resp = await axios.post(
      'https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token',
      payload.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
    );

    // o iFood costuma devolver accessToken/refreshToken/expiresIn
    const { accessToken, refreshToken, expiresIn } = resp.data || {};
    if (!accessToken || !expiresIn) throw new Error('Resposta de token inválida');

    cred.access_token = accessToken;
    cred.refresh_token = refreshToken ?? null;
    cred.expires_at = new Date(Date.now() + (Number(expiresIn) - 60) * 1000); // margem
    await cred.save();

    return accessToken;
  }
}
