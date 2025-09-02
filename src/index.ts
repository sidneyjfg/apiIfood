// src/index.ts
import 'dotenv/config';
import app from './app';
import { sequelize } from './config/database';

// se você salvou nesses caminhos no passo anterior:
import { ensureEnvReady } from './bootstrap/envCheck';
import { startUnsellableCron } from './jobs/unsellableCron';

(async () => {
  try {
    // 1) valida variáveis obrigatórias do .env
    await ensureEnvReady();

    // 2) conecta no banco
    await sequelize.authenticate();
    console.log('Conectado ao MySQL com sucesso.');

    startUnsellableCron()
    // 3) sobe o servidor
    const PORT = Number(process.env.PORT || 3000);
    const server = app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Swagger: http://localhost:${PORT}/docs`);
    });
  } catch (err: any) {
    console.error('❌ Falha na inicialização:', err?.message || err);
    process.exit(1);
  }
})();
