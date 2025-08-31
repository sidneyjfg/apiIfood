import axios from 'axios';
import { Product } from '../database/models/products';
import { StockLog } from '../database/models/stock_logs'; // ajuste o path se necessário

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
        params: {
          includeItems: true,
        },
      }
    );

    const categories = response.data || [];
    console.log(
      `📦 Categorias encontradas (${catalogId}):`,
      categories.map((c: { name: string }) => c.name)
    );

    const seenExternalCodes = new Set<string>();
    let totalInserted = 0;

    for (const category of categories) {
      const rawItems = category.items;
      if (!rawItems) continue;

      const items = Array.isArray(rawItems) ? rawItems : [rawItems];

      for (const item of items) {
        const externalCode = item.externalCode;
        const name = item.name;
        const price = item.price?.value ?? null;
        const status = item.status;
        const productId = item.productId;
        const description = item.description;
        const image = item.imagePath;
        const ean = item.ean;

        const sellingOptionMinimum = item.sellingOption?.minimum ?? null;
        const sellingOptionIncremental = item.sellingOption?.incremental ?? null;

        if (!externalCode || !name || !productId) continue;

        // busca estoque
        let stockAmount = null;
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
          stockAmount = stockResponse.data?.amount ?? null;
        } catch (error: any) {
          console.warn(`Erro ao buscar estoque`, error.message);
        }

        const now = new Date();

        const productData = {
          external_code: externalCode,
          name,
          price,
          status,
          product_id: productId,
          description,
          image_path: image,
          ean,
          merchant_id: merchantId,
          quantity: stockAmount,
          selling_option_minimum: sellingOptionMinimum,
          selling_option_incremental: sellingOptionIncremental,
        };

        const existingProduct = await Product.findOne({
          where: { external_code: externalCode },
        });

        if (existingProduct) {
          const oldQuantity = existingProduct.quantity;
          const newQuantity = stockAmount;

          // Verifica se houve alteração de estoque
          if (oldQuantity !== null && newQuantity !== null && oldQuantity !== newQuantity) {
            await StockLog.create({
              product_sku: externalCode,
              source: 'IFOOD',
              old_quantity: oldQuantity,
              new_quantity: newQuantity,
              status: 'SUCCESS',
              message: 'Estoque atualizado via sincronização com iFood',
            });
          }

          await existingProduct.update(productData);
        } else {
          await Product.create({
            ...productData,
            synced_at: now,
          });

          await StockLog.create({
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
