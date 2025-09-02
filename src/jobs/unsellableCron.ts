import cron from 'node-cron';
import { IfoodUnsellableReactivationService } from '../services/ifoodUnsellableReactivationService';

export function startUnsellableCron() {
  // a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    try {
      const r = await IfoodUnsellableReactivationService.runForAllMerchants();
      console.log('[unsellable-cron] resumo:', JSON.stringify(r));
    } catch (e: any) {
      console.error('[unsellable-cron] erro:', e?.message || e);
    }
  });
}
