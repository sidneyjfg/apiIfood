// src/controllers/ifoodAuthController.ts
import { Request, Response } from 'express';
import { IfoodAuthService } from '../services/ifoodAuthService';
import { pickQueryString } from '@core/utils/pickQueryString';

/**
 * @swagger
 * /token/ifood:
 *   get:
 *     summary: Obtém o token de autenticação do iFood
 *     description: Verifica se existe um token válido salvo. Se não, requisita um novo da API do iFood.
 *     tags:
 *       - iFood
 *     responses:
 *       200:
 *         description: Token obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOi...
 *       500:
 *         description: Erro ao obter token
 */
export const getToken = async (req: Request, res: Response) => {
  const merchantId = pickQueryString(req.query.merchantId);
  try {
    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId é obrigatório' });
    }
    const token = await IfoodAuthService.getAccessToken(merchantId);
    res.status(200).json({ token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
