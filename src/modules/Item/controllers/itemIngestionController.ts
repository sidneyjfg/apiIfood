import { Request, Response } from 'express';
import { IfoodItemIngestionService } from '../services/ifoodItemIngestionService';

export async function postItemIngestionController(req: Request, res: Response) {
  try {
    const { merchantId } = req.params;
    const reset = String(req.query?.reset ?? 'false').toLowerCase() === 'true';

    if (!merchantId) {
      return res.status(400).json({ message: 'merchantId é obrigatório' });
    }
    if (!req.body || (typeof req.body !== 'object')) {
      return res.status(400).json({ message: 'payload de ingestion é obrigatório' });
    }

    const result = await IfoodItemIngestionService.postIngestion(merchantId, req.body, reset);
    res.json({ ok: true, merchantId, reset, result });
  } catch (e: any) {
    console.error('postItemIngestionController:', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha na ingestion de itens', detail: e?.response?.data ?? e?.message });
  }
}

export async function patchItemIngestionController(req: Request, res: Response) {
  try {
    const { merchantId } = req.params;

    if (!merchantId) {
      return res.status(400).json({ message: 'merchantId é obrigatório' });
    }
    if (!req.body || (typeof req.body !== 'object')) {
      return res.status(400).json({ message: 'payload de patch é obrigatório' });
    }

    const result = await IfoodItemIngestionService.patchIngestion(merchantId, req.body);
    res.json({ ok: true, merchantId, result });
  } catch (e: any) {
    console.error('patchItemIngestionController:', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha no patch de ingestion', detail: e?.response?.data ?? e?.message });
  }
}
