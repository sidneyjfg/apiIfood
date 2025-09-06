// src/utils/featureFlags.ts
/**
 * Returns true when the project is configured to keep inventory control ONLY in the ERP,
 * avoiding any iFood inventory publication.
 *
 * Env vars supported:
 *  - CONTROLA_IFOOD_ESTOQUE=1  (preferred)
 *  - Controla_ifood_estoque=1  (backward compatibility with provided name)
 */
export function controlsIfoodStockInERP(): boolean {
  const v1 = process.env.CONTROLA_IFOOD_ESTOQUE;
  const v2 = process.env.Controla_ifood_estoque;
  return v1 === '1' || v2 === '1';
}
