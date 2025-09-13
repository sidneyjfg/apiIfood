type Task<T> = () => Promise<T>;

class SimpleRateLimiter {
  private intervalMs: number;
  private maxPerWindow: number;
  private queue: Array<{ task: Task<any>; resolve: (v: any) => void; reject: (e: any) => void }> = [];
  private timestamps: number[] = [];
  private timer: any = null;

  constructor(maxPerWindow: number, intervalMs: number) {
    this.maxPerWindow = maxPerWindow;
    this.intervalMs = intervalMs;
  }

  private prune(now: number) {
    const cutoff = now - this.intervalMs;
    while (this.timestamps.length && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }

  private tick() {
    const now = Date.now();
    this.prune(now);

    while (this.queue.length && this.timestamps.length < this.maxPerWindow) {
      const job = this.queue.shift()!;
      this.timestamps.push(now);
      job.task()
        .then(job.resolve)
        .catch(job.reject);
    }

    if (this.queue.length) {
      // ainda tem fila, agenda próximo tick
      this.timer = setTimeout(() => this.tick(), 50);
    } else {
      this.timer = null;
    }
  }

  run<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      if (!this.timer) this.tick();
    });
  }
}

const limiters = new Map<string, SimpleRateLimiter>();

/**
 * Executa uma função respeitando o rate limit por "key".
 * @param key chave do limitador (ex.: 'IFOOD:GLOBAL' ou `IFOOD:merchant:${id}`)
 * @param maxPerWindow requisições por janela
 * @param intervalMs tamanho da janela em ms
 * @param fn função que retorna Promise
 */
export async function runWithRateLimit<T>(
  key: string,
  { maxPerWindow = Number(process.env.IFOOD_RATE_MAX ?? 10), intervalMs = Number(process.env.IFOOD_RATE_WINDOW_MS ?? 1000) } = {},
  fn: Task<T>
): Promise<T> {
  const k = `${key}:${maxPerWindow}:${intervalMs}`;
  let limiter = limiters.get(k);
  if (!limiter) {
    limiter = new SimpleRateLimiter(maxPerWindow, intervalMs);
    limiters.set(k, limiter);
  }
  return limiter.run(fn);
}
