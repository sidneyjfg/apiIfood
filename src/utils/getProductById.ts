// utils/getProductById.ts
import { Product } from '../database/models/products';

/**
 * Retorna o product_id (Catálogo iFood) a partir do seu banco local,
 * filtrando por merchant + external_code ou EAN.
 */
export async function getProductById(
  merchantId: string,
  externalCode?: string,
  ean?: string
): Promise<string | null> {
  if (!externalCode && !ean) return null;
  
  const product = await Product.findOne({
    where: {
      merchant_id: merchantId,
      ...(externalCode ? { external_code: externalCode } : {}),
      ...(ean ? { ean } : {}),
    },
  });

  return product?.product_id ?? null;
}
