// src/modules/events/services/ifoodEventsPollingService.ts
import axios, { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { pollingEnabled, excludeHeartbeat } from '@core/utils/featureFlags';
import { IfoodAuthService } from '@modules/authentication/services/ifoodAuthService';
import { ProcessedEvent } from '@db/models/ProcessedEvent';
import { Merchant } from '@db/models/merchants';
import { processIfoodEvent } from '@modules/orders/services/ifoodEventService';

// SEU util (ajuste caso o path seja outro)
// >>> Assinaturas assumidas pelos erros do seu TS:
// runWithRateLimit(key: string, weight: number, fn: () => Promise<T>)
// retry(fn: () => Promise<T>, retries: number)
import { retry, runWithRateLimit } from '@core/utils/httpResilience';

type PollOpts = { types?: string[]; groups?: string[]; merchants?: string[] };

type RawEvent = {
  id?: string;
  eventId?: string;
  merchantId?: string;
  merchant?: { id?: string };
  type?: string;
  code?: string;
  fullCode?: string;
  orderId?: string;
  resourceId?: string;
  [k: string]: any;
};

// helper local para agrupar sem depender de lodash
function groupByKey<T, K extends string>(arr: T[], keyFn: (t: T) => K | '' | undefined): Record<K, T[]> {
  return arr.reduce((acc: any, cur) => {
    const k = (keyFn(cur) ?? '') as K;
    if (!k) return acc;
    (acc[k] ||= []).push(cur);
    return acc;
  }, {} as Record<K, T[]>);
}

export class IfoodEventsPollingService {
  private baseURL = process.env.IFOOD_BASE_URL ?? 'https://merchant-api.ifood.com.br';
  private http = axios.create({ baseURL: this.baseURL, timeout: 15000 });

  // ---- wrappers com retry + rate limit (assinatura: runWithRateLimit(key, options, fn)) ----
  private async safeGet<T = any>(url: string, cfg?: AxiosRequestConfig) {
    // limite padrão: até 10 req/s para este bucket; ajuste aos seus limites
    return runWithRateLimit('ifood-events:get', { maxPerWindow: 10, intervalMs: 1000 }, () =>
      retry(() => this.http.get<T>(url, cfg), 3)
    );
  }

  private async safePost<T = any>(url: string, body: any, cfg?: AxiosRequestConfig) {
    // separar buckets GET/POST ajuda a distribuir melhor
    return runWithRateLimit('ifood-events:post', { maxPerWindow: 10, intervalMs: 1000 }, () =>
      retry(() => this.http.post<T>(url, body, cfg), 3)
    );
  }

  async pollOnce(opts: PollOpts = {}) {
    if (!pollingEnabled()) return;

    const merchants = await this.resolveMerchants(opts.merchants);
    if (!merchants.length) return;

    const params: Record<string, string> = {};
    if (opts.types?.length) params.types = opts.types.join(',');
    if (opts.groups?.length) params.groups = opts.groups.join(',');
    if (excludeHeartbeat()) params.excludeHeartbeat = 'true';

    // GET /events:polling com resiliência
    const { data: events } = await this.safeGet<RawEvent[]>('/events:polling', {
      headers: { 'x-polling-merchants': merchants.join(',') },
      params,
    });

    if (!Array.isArray(events) || events.length === 0) return;

    // === ACK por merchant (token correto) ===
    const byMerchant = groupByKey<RawEvent, string>(events, e => e.merchantId ?? e.merchant?.id);
    await Promise.all(Object.entries(byMerchant).map(async ([merchantId, list]) => {
      // typesafe
      const ids = (list as RawEvent[])
        .map(e => ({ id: e.id ?? e.eventId }))
        .filter((x): x is { id: string } => Boolean(x && x.id));

      if (!ids.length) return;

      const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
      await this.safePost('/events/acknowledgment', { events: ids }, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
    }));

    // Processar com dedupe por (merchantId,eventId)
    await Promise.allSettled(events.map((evt) => this.handle(evt)));
  }

  schedule(intervalMs = Number(process.env.IFOOD_EVENTS_POLL_INTERVAL_MS ?? 30000)) {
    if (!pollingEnabled()) return;
    setInterval(() => this.pollOnce().catch(err => {
      console.error('❌ Polling falhou:', err?.response?.data ?? err?.message ?? err);
    }), intervalMs);
    console.log('🛰️ Polling iFood agendado.');
  }

  // -------- privados --------

  private async resolveMerchants(override?: string[]) {
    if (override?.length) return override;
    const all = await Merchant.findAll({ where: { active: true }, attributes: ['merchant_id'] });
    const fromDb = all.map((m: any) => m.merchant_id);
    if (fromDb.length) return fromDb;
    const fromEnv = (process.env.IFOOD_POLL_MERCHANTS ?? '')
      .split(',').map(s => s.trim()).filter(Boolean);
    return fromEnv;
  }

  private hash(payload: any) {
    return crypto.createHash('sha256')
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
  }

  private async handle(evt: RawEvent) {
    const merchantId = evt.merchantId ?? evt.merchant?.id;
    const eventId = evt.id ?? evt.eventId;
    if (!merchantId || !eventId) return;

    try {
      await ProcessedEvent.create({
        merchant_id: merchantId,
        event_id: eventId,
        event_type: evt.type ?? evt.code ?? 'UNKNOWN',
        payload_hash: this.hash(evt),
        // opcional: se seu TS ainda reclamar, descomente a linha abaixo:
        // created_at: new Date(),
      });
    } catch (e: any) {
      if (e?.name === 'SequelizeUniqueConstraintError') return; // duplicado
      throw e;
    }

    await processIfoodEvent({
      code: evt.code ?? evt.type,
      fullCode: evt.fullCode ?? evt.type,
      orderId: evt.orderId ?? evt.resourceId,
      merchantId,
      ...evt,
    });
  }
}
