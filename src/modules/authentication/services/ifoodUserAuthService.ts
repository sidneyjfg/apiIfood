import axios from 'axios';
import { UserApiIfood } from '@db/models/userApiIfood';
import { retry } from '@core/utils/httpRetry';
import { runWithRateLimit } from '@core/utils/rateLimiter';

const BASE_URL = process.env.IFOOD_BASE_URL ?? 'https://merchant-api.ifood.com.br';
const SKEW_SECONDS = Number(process.env.IFOOD_TOKEN_SKEW_SECONDS ?? 60);
const RL_KEY = 'IFOOD:AUTH';

export class UserIfoodAuthService {
  /**
   * Lê o primeiro registro de user_api_ifood e retorna { access_token }.
   * Reutiliza se estiver válido (skew), renova caso contrário.
   */
  static async getAccessToken(): Promise<{ access_token: string }> {
    const cred = await UserApiIfood.findOne({ order: [['id', 'ASC']] });
    if (!cred) throw new Error('Credenciais não encontradas em user_api_ifood');

    // Reutiliza se ainda válido (com margem)
    if (cred.expires_at && cred.access_token) {
      const secs = Math.floor((cred.expires_at.getTime() - Date.now()) / 1000);
      if (secs > SKEW_SECONDS) {
        return { access_token: cred.access_token };
      }
    }

    // Renova com rate limit + retry/backoff
    const token = await runWithRateLimit(RL_KEY, {}, () =>
      retry(async () => this.requestNewToken(cred.client_id, cred.client_secret))
    );

    cred.access_token = token.accessToken;
    cred.refresh_token = token.refreshToken ?? null;
    cred.expires_at = new Date(Date.now() + (Number(token.expiresIn ?? 3600) - SKEW_SECONDS) * 1000);
    await cred.save();

    return { access_token: token.accessToken };
  }

  private static async requestNewToken(clientId: string, clientSecret: string): Promise<{
    accessToken: string; refreshToken?: string; expiresIn: number;
  }> {
    const payload = new URLSearchParams();
    payload.append('grantType', 'client_credentials');
    payload.append('clientId', clientId);
    payload.append('clientSecret', clientSecret);

    const resp = await axios.post(
      `${BASE_URL}/authentication/v1.0/oauth/token`,
      payload.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, timeout: 15000 }
    );

    const { accessToken, refreshToken, expiresIn } = resp.data ?? {};
    if (!accessToken || !expiresIn) throw new Error('Resposta de token inválida');
    return { accessToken, refreshToken, expiresIn };
    }
}
