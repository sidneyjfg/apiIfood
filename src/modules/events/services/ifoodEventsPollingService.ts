import axios from 'axios';
import crypto from 'crypto';
import { pollingEnabled, excludeHeartbeat } from '@core/utils/featureFlags';
import { IfoodAuthService } from '@modules/authentication/services/ifoodAuthService';
import { ProcessedEvent } from '@db/models/ProcessedEvent'; // seu model já existe
import { Merchant } from '@db/models/merchants'; // para listar merchants ativos
import { processIfoodEvent } from '@modules/orders/services/ifoodEventService';

type PollOpts = { types?: string[]; groups?: string[]; merchants?: string[] };

export class IfoodEventsPollingService {
  private baseURL = process.env.IFOOD_BASE_URL ?? 'https://merchant-api.ifood.com.br';
  private http = axios.create({ baseURL: this.baseURL, timeout: 15000 });

  async pollOnce(opts: PollOpts = {}) {
    if (!pollingEnabled()) return;

    const merchants = await this.resolveMerchants(opts.merchants);
    if (!merchants.length) return;

    const params: any = {};
    if (opts.types?.length)  params.types  = opts.types.join(',');
    if (opts.groups?.length) params.groups = opts.groups.join(',');
    if (excludeHeartbeat())  params.excludeHeartbeat = 'true';

    // GET /events:polling
    const { data: events } = await this.http.get('/events:polling', {
      headers: { 'x-polling-merchants': merchants.join(',') },
      params,
    });
    if (!Array.isArray(events) || !events.length) return;

    // ACK imediato (token de um merchant; se precisar por merchant, faça loop)
    const anyMerchant = merchants[0];
    const { access_token } = await IfoodAuthService.getAccessToken(anyMerchant);
    const ids = events.map((e: any) => ({ id: e.id ?? e.eventId })).filter((x: any) => x.id);
    if (ids.length) {
      await this.http.post('/events/acknowledgment', { events: ids }, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
    }

    // Processar assíncrono com dedupe por (merchantId,eventId)
    await Promise.allSettled(events.map((evt: any) => this.handle(evt)));
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

  private async handle(evt: any) {
    const merchantId = evt.merchantId ?? evt.merchant?.id;
    const eventId    = evt.id ?? evt.eventId;
    if (!merchantId || !eventId) return;

    // dedupe no nível do evento
    try {
      await ProcessedEvent.create({
        merchant_id: merchantId,
        event_id: eventId,
        event_type: evt.type ?? evt.code ?? 'UNKNOWN',
        payload_hash: this.hash(evt),
      });
    } catch (e: any) {
      if (e?.name === 'SequelizeUniqueConstraintError') return; // duplicado: descarta
      throw e;
    }

    // reaproveita SEU serviço de eventos (webhook e polling compartilham pipeline)
    await processIfoodEvent({
      code: evt.code ?? evt.type,
      fullCode: evt.fullCode ?? evt.type,
      orderId: evt.orderId ?? evt.resourceId,
      merchantId,
      ...evt,
    });
  }
}
