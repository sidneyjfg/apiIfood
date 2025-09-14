// src/core/utils/httpResilience.ts
import type { AxiosError } from 'axios';

type Task<T> = () => Promise<T>;

const now = () => Date.now();

// Defaults via ENV (podem ser sobrescritos por parâmetros)
const RATE_MAX_DEF = Number(process.env.IFOOD_RATE_MAX ?? 10);           // req por janela
const RATE_WINDOW_MS_DEF = Number(process.env.IFOOD_RATE_WINDOW_MS ?? 1000);
const RETRIES_DEF = Number(process.env.IFOOD_HTTP_RETRIES ?? 3);
const BASE_DELAY_MS_DEF = Number(process.env.IFOOD_HTTP_BACKOFF_BASE_MS ?? 300);
const TIMEOUT_GAP_RETRY = Number(process.env.IFOOD_TIMEOUT_RETRY ?? 1); // 1 => retry tb em timeout/erros de rede

// --------------------------- Retry helpers ---------------------------

/** Tenta ler Retry-After (segundos ou data) e converte para ms */
export function getRetryAfterMs(err: AxiosError): number | null {
  const hdr = err.response?.headers?.['retry-after'];
  if (!hdr) return null;
  const n = Number(hdr);
  if (Number.isFinite(n)) return n * 1000; // segundos
  const dateMs = Date.parse(String(hdr));
  if (!Number.isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? diff : null;
  }
  return null;
}

/** Define se vale a pena tentar novamente */
export function shouldRetry(err: any): boolean {
  const ax = err as AxiosError;
  if (!ax || !ax.isAxiosError) return false;
  const status = ax.response?.status;
  if (status === 429) return true;
  if (status && status >= 500) return true;
  // Sem status: erros de rede/timeout comuns do axios
  const code = (ax as any)?.code as string | undefined;
  if (!status && TIMEOUT_GAP_RETRY) {
    if (code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNABORTED'].includes(code)) return true;
    // também consideramos timeouts sem code
    return true;
  }
  return false;
}

/** Backoff exponencial com jitter */
export function backoffDelay(attempt: number, baseMs = BASE_DELAY_MS_DEF, maxMs = 8000) {
  const expo = Math.min(maxMs, Math.round(baseMs * Math.pow(2, attempt)));
  const jitter = Math.round(Math.random() * (expo * 0.2));
  return expo + jitter;
}

/** Retry com suporte a Retry-After, backoff e jitter */
export async function retry<T>(fn: () => Promise<T>, maxAttempts = RETRIES_DEF): Promise<T> {
  let attempt = 0;
  let lastErr: any;
  // attempts: 0..maxAttempts (onde 0 é a primeira tentativa sem atraso)
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e as AxiosError;
      if (!shouldRetry(lastErr) || attempt === maxAttempts) break;
      const ra = getRetryAfterMs(lastErr);
      const delay = ra ?? backoffDelay(attempt);
      await new Promise(r => setTimeout(r, delay));
      attempt += 1;
    }
  }
  throw lastErr;
}

// --------------------------- Rate limit (por chave) ---------------------------

type Bucket = { count: number; windowStart: number; max: number; windowMs: number };
const buckets = new Map<string, Bucket>();

/**
 * Executa uma função respeitando o rate limit por "key".
 * Usa janela deslizante simples + fila implícita via await.
 */
export async function runWithRateLimit<T>(
  key: string,
  {
    maxPerWindow = RATE_MAX_DEF,
    intervalMs = RATE_WINDOW_MS_DEF,
  }: { maxPerWindow?: number; intervalMs?: number } = {},
  fn: Task<T>
): Promise<T> {
  const compositeKey = `${key}:${maxPerWindow}:${intervalMs}`;
  let b = buckets.get(compositeKey);
  const t = now();

  if (!b) {
    b = { count: 0, windowStart: t, max: maxPerWindow, windowMs: intervalMs };
    buckets.set(compositeKey, b);
  }

  // prune janela
  const elapsed = t - b.windowStart;
  if (elapsed > b.windowMs) {
    b.count = 0;
    b.windowStart = t;
  }

  if (b.count >= b.max) {
    const wait = b.windowMs - elapsed + 5;
    await new Promise(r => setTimeout(r, wait));
    // reinicia janela
    b.count = 0;
    b.windowStart = now();
  }

  b.count += 1;
  buckets.set(compositeKey, b);
  return fn();
}

// --------------------------- Circuit breaker ---------------------------

const cbState = new Map<string, { failures: number; openUntil: number }>();
const CB_FAIL_THRESHOLD = Number(process.env.IFOOD_CB_FAIL_THRESHOLD ?? 5);
const CB_OPEN_MS = Number(process.env.IFOOD_CB_OPEN_MS ?? 10000);

/** Circuit breaker simples por chave */
export async function circuit<T>(key: string, task: Task<T>): Promise<T> {
  const state = cbState.get(key) ?? { failures: 0, openUntil: 0 };
  if (now() < state.openUntil) {
    const e = new Error(`Circuit open for ${key}`);
    (e as any).code = 'CIRCUIT_OPEN';
    throw e;
  }
  try {
    const res = await task();
    state.failures = 0;
    state.openUntil = 0;
    cbState.set(key, state);
    return res;
  } catch (err) {
    state.failures += 1;
    if (state.failures >= CB_FAIL_THRESHOLD) {
      state.openUntil = now() + CB_OPEN_MS;
    }
    cbState.set(key, state);
    throw err;
  }
}
