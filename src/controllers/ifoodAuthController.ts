// src/controllers/ifoodAuthController.ts
import { Request, Response } from 'express';
import { IfoodAuthService } from '../services/ifoodAuthService';

export class IfoodAuthController {
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
  static async getToken(req: Request, res: Response): Promise<void> {
    try {
      const token = await IfoodAuthService.getAccessToken();
      res.status(200).json({ token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}