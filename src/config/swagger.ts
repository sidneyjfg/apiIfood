import swaggerJSDoc from 'swagger-jsdoc';

type SwaggerJSDocOptions = {
  definition: {
    openapi: '3.0.0' | '3.1.0';
    info: { title: string; version: string; description?: string };
    components?: any;
    security?: any[];
    servers?: { url: string; description?: string }[];
  };
  apis: string[];
};

const options: SwaggerJSDocOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'iFood-ERP Stock Sync API',
      version: '1.0.0',
      description: 'Documentação da API de integração com iFood e ERP',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
    servers: [
      { url: '/api', description: 'API base (reverse proxy)' },
      { url: 'http://localhost:3000', description: 'Local Dev' },
    ],
  },
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
    './src/modules/**/*.ts',
    './src/config/swagger/*.yaml',
  ],
};

export const swaggerSpec = swaggerJSDoc(options as any);
