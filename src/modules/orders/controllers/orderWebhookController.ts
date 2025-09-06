import { Request, Response } from 'express';
import { processIfoodEvent } from '../services/ifoodEventService';
import { verifyHmacSHA256 } from '@core/utils/verifyHmacSHA256';

const IFOOD_SIGNATURE_SECRET = process.env.IFOOD_SIGNATURE_SECRET || '';

export async function handleIfoodWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-ifood-signature'];
    if (!signature || typeof signature !== 'string') {
      return res.status(401).json({ error: 'Assinatura ausente ou inválida' });
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(400).json({ error: 'Corpo bruto ausente para verificação da assinatura' });
    }

    const valid = verifyHmacSHA256(IFOOD_SIGNATURE_SECRET, rawBody, signature);
    if (!valid) {
      return res.status(403).json({ error: 'Assinatura inválida' });
    }

    await processIfoodEvent(req.body);
    return res.status(200).json({ status: 'OK' });
  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error.message);
    return res.status(500).json({ error: 'Erro ao processar webhook' });
  }
}

export async function handleErpWebhook(req: Request, res: Response) {

}