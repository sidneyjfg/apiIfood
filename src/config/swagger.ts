// src/config/swagger.ts
import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'iFood-ERP Stock Sync API',
      version: '1.0.0',
      description: 'Documentação da API de integração com iFood e ERP',
    },
  },
  tags: [
    { name: 'Authentication', description: 'Como autenticar' },
    { name: 'Merchant', description: 'Detalhes e configurações das lojas' },
    { name: 'Catalog', description: 'Catálogo de produtos' },
    { name: 'Events', description: 'Eventos (webhook/polling)' },
    { name: 'Order', description: 'Pedidos' },
    { name: 'Item', description: 'Groceries - Itens' },
    { name: 'Picking', description: 'Groceries - Picking' },
  ],
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
