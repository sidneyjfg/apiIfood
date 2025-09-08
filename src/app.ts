import express from 'express';
import dotenv from 'dotenv';
import routes from './routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { rawBodyMiddleware } from '@core/middlewares/rawBodyMiddleware';
const generated = require('@config/openapi.generated.json');

dotenv.config();

const app = express();
app.use(express.json({ verify: rawBodyMiddleware }));
app.use(routes);

// Rota Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/docs/generated', swaggerUi.serve, swaggerUi.setup(generated));

export default app;
