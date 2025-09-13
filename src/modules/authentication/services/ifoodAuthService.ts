import axios from 'axios';
import { AuthToken } from '@db/models/auth_tokens';
import { Op, UniqueConstraintError } from 'sequelize';
import { retry } from '@core/utils/httpRetry';
import { runWithRateLimit } from '@core/utils/rateLimiter';

const BASE_URL = process.env.IFOOD_BASE_URL ?? 'https://merchant-api.ifood.com.br';
const SKEW_SECONDS = Number(process.env.IFOOD_TOKEN_SKEW_SECONDS ?? 60);
const RL_KEY = 'IFOOD:AUTH';

export class IfoodAuthService {
  static async getAccessToken(merchantId: string): Promise<{ access_token: string }> {
    const now = new Date();
    const skewCut = new Date(now.getTime() + SKEW_SECONDS * 1000);

    const existing = await AuthToken.findOne({
      where: { merchant_id: merchantId, provider: 'IFOOD', expires_at: { [Op.gt]: skewCut } },
      order: [['created_at', 'DESC']],
    });
    if (existing?.access_token) {
      return { access_token: existing.access_token };
    }

    // solicita novo token (usa shape { accessToken, refreshToken, expiresIn })
    const token = await runWithRateLimit(RL_KEY, {}, () =>
      retry(async () => this.requestNewToken())
    );

    const expiresAt = new Date(
      Date.now() + (Number(token.expiresIn ?? 3600) - SKEW_SECONDS) * 1000
    );

    try {
      await AuthToken.upsert({
        merchant_id: merchantId,
        provider: 'IFOOD',
        access_token: token.accessToken,
        refresh_token: token.refreshToken ?? null,
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);
    } catch (e: any) {
      if (e instanceof UniqueConstraintError) {
        const latest = await AuthToken.findOne({
          where: { merchant_id: merchantId, provider: 'IFOOD' },
          order: [['created_at', 'DESC']],
        });
        if (latest?.access_token) return { access_token: latest.access_token };
      }
      console.error('❌ Falha ao persistir token iFood:', e?.message ?? e);
      throw e;
    }

    return { access_token: token.accessToken };
  }

  private static async requestNewToken(): Promise<{
    accessToken: string; refreshToken?: string; expiresIn: number;
  }> {
    const { IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET } = process.env;
    if (!IFOOD_CLIENT_ID || !IFOOD_CLIENT_SECRET) {
      throw new Error('IFOOD_CLIENT_ID/IFOOD_CLIENT_SECRET não configurados');
    }

    const payload = new URLSearchParams();
    payload.append('grantType', 'client_credentials');
    payload.append('clientId', IFOOD_CLIENT_ID);
    payload.append('clientSecret', IFOOD_CLIENT_SECRET);

    const resp = await axios.post(
      `${BASE_URL}/authentication/v1.0/oauth/token`,
      payload.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, timeout: 15000 }
    );

    const { accessToken, refreshToken, expiresIn } = resp.data ?? {};
    if (!accessToken || !expiresIn) throw new Error('Token não retornado pela API do iFood');
    return { accessToken, refreshToken, expiresIn };
  }

  static async refreshAccessToken(merchantId: string, refresh_token: string): Promise<{ access_token: string }> {
    const payload = new URLSearchParams();
    payload.append('grantType', 'refresh_token');
    payload.append('clientId', process.env.IFOOD_CLIENT_ID ?? '');
    payload.append('clientSecret', process.env.IFOOD_CLIENT_SECRET ?? '');
    payload.append('refreshToken', refresh_token);

    const resp = await runWithRateLimit(RL_KEY, {}, () =>
      retry(() =>
        axios.post(
          `${BASE_URL}/authentication/v1.0/oauth/token`,
          payload.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, timeout: 15000 }
        )
      )
    );

    // no refresh a API costuma responder com snake_case; trate ambos
    const data = resp.data ?? {};
    const accessToken: string | undefined = data.accessToken ?? data.access_token;
    const newRefreshToken: string | undefined = data.refreshToken ?? data.refresh_token;
    const expiresIn: number | undefined = data.expiresIn ?? data.expires_in;

    if (!accessToken || !expiresIn) throw new Error('Falha ao renovar token do iFood');

    const expires_at = new Date(Date.now() + (Number(expiresIn) - SKEW_SECONDS) * 1000);
    await AuthToken.upsert({
      merchant_id: merchantId,
      provider: 'IFOOD',
      access_token: accessToken,
      refresh_token: newRefreshToken ?? refresh_token ?? null,
      expires_at,
      updated_at: new Date(),
      created_at: new Date(),
    } as any);

    return { access_token: accessToken };
  }
}
