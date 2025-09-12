// src/index.ts
import 'dotenv/config';
import app from './app';
import { sequelize } from './config/database';

import { ensureEnvReady } from './bootstrap/envCheck';
import { startUnsellableCron } from './jobs/unsellableCron';

import { IfoodEventsPollingService } from '@modules/events/services/ifoodEventsPollingService';
import { pollingEnabled } from '@core/utils/featureFlags';

function toCsvArray(env?: string) {
  return (env ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

async function bootstrapPolling() {
  if (!pollingEnabled()) {
    console.log('⏸️ Polling desativado por IFOOD_POLL_ENABLED=false');
    return;
  }

  const baseUrl = process.env.IFOOD_BASE_URL ?? 'https://merchant-api.ifood.com.br';
  const intervalMs = Number.isFinite(Number(process.env.IFOOD_EVENTS_POLL_INTERVAL_MS))
    ? Number(process.env.IFOOD_EVENTS_POLL_INTERVAL_MS)
    : 30_000;

  const svc = new IfoodEventsPollingService();
  svc.schedule(intervalMs);

  console.log(
    `🛰️ Polling iFood agendado: interval=${intervalMs}ms baseUrl=${baseUrl} ` +
    `(types=${process.env.IFOOD_POLL_TYPES ?? '-'} groups=${process.env.IFOOD_POLL_GROUPS ?? '-'} merchants=${process.env.IFOOD_POLL_MERCHANTS ?? '-'})`
  );
}

(async () => {
  let server: import('http').Server | undefined;

  try {
    // 1) valida variáveis obrigatórias do .env
    await ensureEnvReady();

    // 2) conecta no banco
    await sequelize.authenticate();
    console.log('✅ Conectado ao MySQL com sucesso.');

    // 3) jobs e polling
    startUnsellableCron();
    await bootstrapPolling();

    // 4) sobe o servidor HTTP
    const PORT = Number(process.env.PORT || 3000);
    server = app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📚 Swagger: http://localhost:${PORT}/docs`);
    });
  } catch (err: any) {
    console.error('❌ Falha na inicialização:', err?.response?.data ?? err?.message ?? err);
    process.exit(1);
  }

  // Shutdown gracioso
  const shutdown = async (signal: string) => {
    try {
      console.log(`\n🧹 Recebido ${signal}. Encerrando...`);
      if (server) {
        await new Promise<void>((resolve) => server!.close(() => resolve()));
      }
      await sequelize.close();
      console.log('👋 Encerrado com sucesso.');
      process.exit(0);
    } catch (e) {
      console.error('⚠️ Erro ao encerrar:', (e as any)?.message ?? e);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // segurança extra
  process.on('unhandledRejection', (reason) => {
    console.error('⚠️ UnhandledRejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('⚠️ UncaughtException:', err);
  });
})();
