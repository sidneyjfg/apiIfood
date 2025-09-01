// services/IfoodProductService.ts
import axios from 'axios';
import { Product } from '../database/models/products';
import { StockLog } from '../database/models/stock_logs';

export class IfoodProductService {
  static async syncAllCatalogs(
    merchantId: string,
    accessToken: string
  ): Promise<{ totalInserted: number }> {
    const catalogResponse = await axios.get(
      `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    const catalogs = catalogResponse.data || [];
    console.log('Catálogos encontrados:', catalogs);

    let totalInserted = 0;

    for (const catalog of catalogs) {
      const catalogId = catalog.catalogId;
      if (!catalogId) continue;

      const result = await this.syncItemsFromCategories(merchantId, catalogId, accessToken);
      totalInserted += result.totalInserted;
    }

    return { totalInserted };
  }

  static async syncItemsFromCategories(
    merchantId: string,
    catalogId: string,
    accessToken: string
  ): Promise<{ totalInserted: number }> {
    const response = await axios.get(
      `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        params: { includeItems: true },
      }
    );

    const categories = response.data || [];
    console.log(
      `📦 Categorias encontradas (${catalogId}):`,
      categories.map((c: { name: string }) => c.name)
    );

    let totalInserted = 0;

    for (const category of categories) {
      const rawItems = category.items;
      if (!rawItems) continue;

      const items = Array.isArray(rawItems) ? rawItems : [rawItems];

      for (const item of items) {
        const externalCode: string | undefined = item.externalCode;
        const name: string | undefined = item.name;
        const price: number | null = item.price?.value ?? null;
        const status: string | undefined = item.status;
        const productId: string | undefined = item.productId;
        const description: string | undefined = item.description;
        const image: string | undefined = item.imagePath;
        const ean: string | undefined = item.ean;

        const sellingOptionMinimum: number | null = item.sellingOption?.minimum ?? null;
        const sellingOptionIncremental: number | null = item.sellingOption?.incremental ?? null;

        if (!externalCode || !name || !productId) continue;

        // Buscar estoque atual no iFood
        let stockAmount: number | null = null;
        try {
          const stockResponse = await axios.get(
            `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/inventory/${productId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            }
          );
          // amount é número
          stockAmount = typeof stockResponse.data?.amount === 'number'
            ? stockResponse.data.amount
            : null;
        } catch (error: any) {
          console.warn(`⚠️ Erro ao buscar estoque do produto ${productId}:`, error?.message ?? error);
        }

        // Montar dados compatíveis com o seu Product model
        const productData: Partial<Product> = {
          external_code: externalCode,
          name,
          price: price as any, // ajuste o tipo no seu model se for DECIMAL
          status: status as any,
          product_id: productId,
          description,
          image_path: image,
          ean,
          merchant_id: merchantId,
          on_hand: stockAmount ?? 0, // <-- usar on_hand
          // selling_option_minimum / selling_option_incremental
          // só inclua se existirem no seu model/tabela
          // selling_option_minimum: sellingOptionMinimum as any,
          // selling_option_incremental: sellingOptionIncremental as any,
        };

        // Garanta que busca considere merchant_id para não colidir entre lojas
        const existingProduct = await Product.findOne({
          where: { external_code: externalCode, merchant_id: merchantId },
        });

        if (existingProduct) {
          const oldOnHand = existingProduct.on_hand ?? 0;
          const newOnHand = stockAmount ?? oldOnHand;

          // Se mudou o estoque publicado no iFood, logar
          if (typeof stockAmount === 'number' && oldOnHand !== newOnHand) {
            await StockLog.create({
              merchant_id: merchantId,
              product_sku: externalCode,
              source: 'IFOOD',
              old_quantity: oldOnHand,
              new_quantity: newOnHand,
              status: 'SUCCESS',
              message: 'Estoque (on_hand) atualizado via sincronização com iFood',
            });
          }

          await existingProduct.update(productData as any);
        } else {
          // Se seu model não tiver 'synced_at', NÃO passe esse campo aqui.
          await Product.create(productData as any);

          await StockLog.create({
            merchant_id: merchantId,
            product_sku: externalCode,
            source: 'IFOOD',
            old_quantity: null,
            new_quantity: stockAmount,
            status: 'SUCCESS',
            message: 'Produto criado com estoque inicial via iFood',
          });
        }

        totalInserted++;
      }
    }

    return { totalInserted };
  }

  static async getProductByExternalCode(
    merchantId: string,
    externalCode: string,
    accessToken: string
  ): Promise<any> {
    const response = await axios.get(
      `https://merchant-api.ifood.com.br/merchants/${merchantId}/products/externalCode/${externalCode}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    console.log(`🔍 Produto encontrado por externalCode [${externalCode}]`, response.data);
    return response.data;
  }

  static async getProductById(
    merchantId: string,
    productId: string,
    accessToken: string
  ): Promise<any> {
    const response = await axios.get(
      `https://merchant-api.ifood.com.br/merchants/${merchantId}/product/${productId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    return response.data;
  }
}
