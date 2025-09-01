import { Request, Response } from 'express';
import { IfoodMerchantService } from '../services/ifoodMerchantService';

export async function buscarLojas(req: Request, res: Response) {
  try {
    const page = Number(req.query.page ?? 1) || 1;
    const size = Math.min(200, Number(req.query.size ?? 100) || 100);

    const result = await IfoodMerchantService.syncMerchantsToDB(page, size);
    res.json(result);
  } catch (err: any) {
    const msg = err?.response?.data || err?.message || 'Erro ao buscar/gravar lojas';
    res.status(500).json({ error: msg });
  }
}
