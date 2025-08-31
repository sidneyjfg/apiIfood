import express from 'express';
import dotenv from 'dotenv';
import routes from './routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { rawBodyMiddleware } from './middlewares/rawBodyMiddleware';

dotenv.config();

const app = express();
app.use(express.json({ verify: rawBodyMiddleware }));
app.use(routes);

// Rota Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default app;
