// utils/getProductIdForIfood.ts  (inalterado; apenas conferi imports)
import { getProductById } from './getProductById';
import { Product } from '@db/models/products';

export async function getProductIdForIfood(merchantId: string, p: Product) {
  return getProductById(
    merchantId,
    p.external_code ?? undefined, // null vira undefined
    p.ean ?? undefined
  );
}

