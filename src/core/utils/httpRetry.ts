import type { AxiosError } from 'axios';

export function getRetryAfterMs(err: AxiosError): number | null {
  const hdr = err.response?.headers?.['retry-after'];
  if (!hdr) return null;
  const n = Number(hdr);
  if (Number.isFinite(n)) return n * 1000; // segundos
  // se vier uma data, calcula diferença p/ agora
  const dateMs = Date.parse(String(hdr));
  if (!Number.isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? diff : null;
  }
  return null;
}

export function shouldRetry(err: AxiosError): boolean {
  const status = err.response?.status ?? 0;
  // HTTP retry
  if (status === 429 || (status >= 500 && status < 600)) return true;
  // Network/timeout sem status
  const code = (err as any)?.code as string | undefined;
  if (!status && code) {
    return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNABORTED'].includes(code);
  }
  return false;
}

export function backoffDelay(attempt: number, baseMs = 300, maxMs = 8000) {
  const expo = Math.min(maxMs, Math.round(baseMs * Math.pow(2, attempt)));
  const jitter = Math.round(Math.random() * (expo * 0.2));
  return expo + jitter;
}

export async function retry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let attempt = 0;
  // attempts: 1..maxAttempts
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      const err = e as AxiosError;
      attempt++;
      if (!shouldRetry(err) || attempt >= maxAttempts) throw err;
      const ra = getRetryAfterMs(err);
      const delay = ra ?? backoffDelay(attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
