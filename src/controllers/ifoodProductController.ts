import { Request, Response } from 'express';
import { IfoodAuthService } from '../services/ifoodAuthService';
import { IfoodProductService } from '../services/ifoodProductService';
import { pickQueryString } from '../utils/pickQueryString';
import { Merchant } from '../database/models/merchants';

export const syncIfoodItemsAll = async (req: Request, res: Response) => {
  try {
    // pega todos os merchants ativos
    const merchants = await Merchant.findAll({
      where: { active: true },
      attributes: ['merchant_id', 'name'],
      order: [['name', 'ASC']],
    });

    if (!merchants.length) {
      return res.status(200).json({
        message: 'Nenhuma loja ativa cadastrada em merchants.',
        processed: 0,
        successes: 0,
        failures: 0,
        results: [],
      });
    }

    const results: Array<{ merchantId: string; name?: string; total_inserted?: number; error?: string }> = [];
    let successes = 0;
    let failures = 0;

    // processamento sequencial para evitar rate limit
    for (const m of merchants) {
      const merchantId = String((m as any).merchant_id);
      const name = (m as any).name as string | undefined;

      try {
        const { access_token } = await IfoodAuthService.getAccessToken(merchantId);
        const { totalInserted } = await IfoodProductService.syncAllCatalogs(merchantId, access_token);

        results.push({ merchantId, name, total_inserted: totalInserted });
        successes++;
      } catch (e: any) {
        const msg = e?.response?.data || e?.message || 'Erro desconhecido';
        results.push({ merchantId, name, error: typeof msg === 'string' ? msg : JSON.stringify(msg) });
        failures++;
      }
    }

    return res.status(200).json({
      message: 'Sincronização concluída para todas as lojas ativas',
      processed: merchants.length,
      successes,
      failures,
      results,
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar itens (todas as lojas):', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao sincronizar itens para todas as lojas' });
  }
};

export const getProductByExternalCode = async (req: Request, res: Response) => {
  const merchantId = pickQueryString(req.query.merchantId);
  const { externalCode } = req.params;

  if (!merchantId) {
    return res.status(400).json({ error: 'merchantId é obrigatório' });
  }

  try {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);

    const product = await IfoodProductService.getProductByExternalCode(
      merchantId.toString(),
      externalCode,
      access_token
    );

    return res.status(200).json(product);
  } catch (error: any) {
    console.error('Erro ao buscar produto por externalCode:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao buscar produto por código externo' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  const merchantId = pickQueryString(req.query.merchantId);
  const { productId } = req.params;

  if (!merchantId) {
    return res.status(400).json({ error: 'merchantId é obrigatório' });
  }

  try {
    const { access_token } = await IfoodAuthService.getAccessToken(merchantId);

    const product = await IfoodProductService.getProductById(
      merchantId.toString(),
      productId,
      access_token
    );

    return res.status(200).json(product);
  } catch (error: any) {
    console.error('Erro ao buscar produto por ID:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao buscar produto por ID' });
  }
};
