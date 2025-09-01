import { Router } from 'express';
import { getToken } from '../controllers/ifoodAuthController';
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
 *     summary: Webhook de eventos do iFood
 *     description: Recebe eventos de pedido do iFood (ex.: PLC, CAN, CON) e processa estoque/snapshot por loja.
 *     tags:
 *       - iFood Webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Código curto do evento (PLC, CAN, CON, etc.)
 *                 example: PLC
 *               fullCode:
 *                 type: string
 *                 description: Código completo do evento
 *                 example: PLACED
 *               orderId:
 *                 type: string
 *                 description: ID do pedido no iFood
 *                 example: d7bc9aa1-2dd4-42c3-8677-b884ed68b1dd
 *               merchantId:
 *                 type: string
 *                 description: merchantId da loja no iFood
 *                 example: 2a65a2fa-d8c5-4787-a9cb-4894a7a68cbe
 *               salesChannel:
 *                 type: string
 *                 description: Canal de venda
 *                 example: IFOOD
 *     responses:
 *       200:
 *         description: Evento processado (ou ignorado) com sucesso
 *       400:
 *         description: Payload inválido
 *       500:
 *         description: Erro interno ao processar webhook
 */
router.post('/webhook/ifood', handleIfoodWebhook);

/**
 * @swagger
 * /ifood/token:
 *   get:
 *     summary: Obtém ou reutiliza o token do iFood para uma loja (merchant)
 *     description: Retorna um token OAuth válido. Reutiliza um token salvo se ainda estiver válido.
 *     tags:
 *       - iFood Auth
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: merchantId da loja no iFood
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
 *       400:
 *         description: Parâmetro merchantId ausente
 *       500:
 *         description: Erro ao obter token
 */
router.get('/ifood/token', getToken);

/**
 * @swagger
 * /ifood/items/sync:
 *   get:
 *     summary: Sincroniza itens do catálogo do iFood para a loja
 *     description: Busca todos os catálogos do merchant e sincroniza os itens (ofertas) no banco, sem duplicar.
 *     tags:
 *       - iFood Items
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: merchantId da loja no iFood
 *     responses:
 *       200:
 *         description: Itens sincronizados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Itens sincronizados com sucesso
 *                 total_inserted:
 *                   type: integer
 *                   example: 42
 *       400:
 *         description: Parâmetro merchantId ausente
 *       500:
 *         description: Erro ao sincronizar itens
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
 *         description: Código externo do produto (SKU no catálogo)
 *       - in: query
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: merchantId da loja no iFood
 *     responses:
 *       200:
 *         description: Produto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Parâmetro merchantId ausente
 *       404:
 *         description: Produto não encontrado
 *       500:
 *         description: Erro ao buscar produto por código externo
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
 *         description: ID do produto no iFood (productId do catálogo)
 *       - in: query
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: merchantId da loja no iFood
 *     responses:
 *       200:
 *         description: Produto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Parâmetro merchantId ausente
 *       404:
 *         description: Produto não encontrado
 *       500:
 *         description: Erro ao buscar produto por ID
 */
router.get('/ifood/products/:productId', getProductById);

export default router;
