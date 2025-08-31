import { Request, Response } from 'express';
import { IfoodAuthService } from '../services/ifoodAuthService';
import { IfoodProductService } from '../services/ifoodProductService';

export const syncIfoodItems = async (req: Request, res: Response) => {
  const { merchantId } = req.query;

  if (!merchantId) {
    return res.status(400).json({ error: 'merchantId é obrigatório' });
  }

  try {
    const { access_token } = await IfoodAuthService.getAccessToken();

    const result = await IfoodProductService.syncAllCatalogs(
      merchantId.toString(),
      access_token
    );

    return res.status(200).json({
      message: 'Itens sincronizados com sucesso',
      total_inserted: result.totalInserted,
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar itens do iFood:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao sincronizar itens do iFood' });
  }
};

export const getProductByExternalCode = async (req: Request, res: Response) => {
  const { merchantId } = req.query;
  const { externalCode } = req.params;

  if (!merchantId) {
    return res.status(400).json({ error: 'merchantId é obrigatório' });
  }

  try {
    const { access_token } = await IfoodAuthService.getAccessToken();

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
  const { merchantId } = req.query;
  const { productId } = req.params;

  if (!merchantId) {
    return res.status(400).json({ error: 'merchantId é obrigatório' });
  }

  try {
    const { access_token } = await IfoodAuthService.getAccessToken();

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
