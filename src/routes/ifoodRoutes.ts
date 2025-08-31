import { Router } from 'express';
import { IfoodAuthController } from '../controllers/ifoodAuthController';
import { handleIfoodWebhook } from '../controllers/webhookController';
import {
    syncIfoodItems,
    getProductByExternalCode,
    getProductById
} from '../controllers/ifoodProductController';

const router = Router();

/**
 * @swagger
 * /webhook/ifood:
 *   post:
 *     summary: Webhook de pedidos do iFood
 *     description: Recebe pedidos confirmados do iFood e atualiza o ERP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               id: "123"
 *               items:
 *                 - name: "Pizza"
 *                   quantity: 2
 *                   externalCode: "SKU123"
 *     responses:
 *       200:
 *         description: Pedido processado com sucesso
 */
router.post('/webhook/ifood', handleIfoodWebhook);

/**
 * @swagger
 * /token/ifood:
 *   get:
 *     summary: Obtém ou reutiliza o token de autenticação do iFood
 *     description: >
 *       Retorna um token OAuth válido da API do iFood, reutilizando um salvo se ainda estiver válido.
 *       Indica o tempo restante em segundos até a expiração do token.
 *     tags:
 *       - iFood
 *     responses:
 *       200:
 *         description: Token válido retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token reutilizado com sucesso
 *                 access_token:
 *                   type: string
 *                   example: eyJhbGciOi...
 *                 expires_in:
 *                   type: integer
 *                   example: 21599
 *       500:
 *         description: Erro ao obter token
 */
router.get('/ifood/token', IfoodAuthController.getToken);

/**
 * @swagger
 * /ifood/items/sync:
 *   get:
 *     summary: Sincroniza os itens do iFood
 *     description: Busca todos os itens (ofertas de produtos visíveis) de todas as categorias do catálogo e salva no banco sem duplicar.
 *     tags:
 *       - iFood Items
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do merchant
 *       - in: query
 *         name: catalogId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do catálogo
 *     responses:
 *       200:
 *         description: Itens sincronizados com sucesso
 */
router.get('/ifood/items/sync', syncIfoodItems);
/**
 * @swagger
 * /ifood/products/external/{externalCode}:
 *   get:
 *     summary: Busca um produto do iFood pelo código externo (SKU)
 *     tags:
 *       - iFood Products
 *     parameters:
 *       - in: path
 *         name: externalCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Código externo do produto
 *       - in: query
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do merchant
 *     responses:
 *       200:
 *         description: Produto encontrado com sucesso
 */
router.get('/ifood/products/external/:externalCode', getProductByExternalCode);

/**
 * @swagger
 * /ifood/products/{productId}:
 *   get:
 *     summary: Busca um produto do iFood pelo ID do produto
 *     tags:
 *       - iFood Products
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do produto
 *       - in: query
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do merchant
 *     responses:
 *       200:
 *         description: Produto encontrado com sucesso
 */
router.get('/ifood/products/:productId', getProductById);

export default router;
