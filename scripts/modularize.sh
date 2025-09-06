#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "➡️  Criando rotas por módulo em: $ROOT"

# 0) mover saveOrderSnapshot para core/utils (se ainda não foi movido)
if [ -e "src/utils/saveOrderSnapshot.ts" ]; then
  echo "📦 Movendo src/utils/saveOrderSnapshot.ts -> src/core/utils/saveOrderSnapshot.ts"
  mkdir -p src/core/utils
  mv -v src/utils/saveOrderSnapshot.ts src/core/utils/saveOrderSnapshot.ts
else
  echo "ℹ️  (skip) saveOrderSnapshot.ts já movido ou não existe em src/utils"
fi

# 1) garantir pastas dos módulos
mkdir -p \
  src/modules/merchant/{controllers,services} \
  src/modules/catalog/{controllers,services} \
  src/modules/orders/{controllers,services} \
  src/modules/events/services \
  src/modules/groceries/item/{controllers,services} \
  src/modules/groceries/picking/{controllers,services}

# 2) criar routes.ts de cada módulo (apenas se não existir)

# -- MERCHANT
if [ ! -e "src/modules/merchant/routes.ts" ]; then
  cat > "src/modules/merchant/routes.ts" <<'EOF'
import { Router } from 'express';
import {
  getMerchantStatus,
  createInterruption,
  listInterruptions,
  deleteInterruption,
  getOpeningHours,
  putOpeningHours,
} from './controllers/merchantController';
// se quiser listar/sincronizar merchants, reimporte seu controller legado:
// import { buscarLojas } from '../../controllers/storeController';

const router = Router();

// opcional: listar/sync merchants (descomentar se desejar)
// router.get('/', buscarLojas);

router.get('/:merchantId/status', getMerchantStatus);
router.post('/:merchantId/interruptions', createInterruption);
router.get('/:merchantId/interruptions', listInterruptions);
router.delete('/:merchantId/interruptions/:interruptionId', deleteInterruption);
router.get('/:merchantId/opening-hours', getOpeningHours);
router.put('/:merchantId/opening-hours', putOpeningHours);

export default router;
EOF
  echo "✅ Criado src/modules/merchant/routes.ts"
else
  echo "ℹ️  (skip) src/modules/merchant/routes.ts já existe"
fi

# -- CATALOG
if [ ! -e "src/modules/catalog/routes.ts" ]; then
  cat > "src/modules/catalog/routes.ts" <<'EOF'
import { Router } from 'express';
// importe seus handlers reais quando prontos
// import { getProduct, listProducts, patchProductsStatus } from './controllers/productController';

const router = Router();

// Exemplos (descomente/implante seus handlers reais):
// router.get('/products', listProducts);
// router.get('/products/:productId', getProduct);
// router.patch('/products/status', patchProductsStatus);

export default router;
EOF
  echo "✅ Criado src/modules/catalog/routes.ts"
else
  echo "ℹ️  (skip) src/modules/catalog/routes.ts já existe"
fi

# -- ORDERS
if [ ! -e "src/modules/orders/routes.ts" ]; then
  cat > "src/modules/orders/routes.ts" <<'EOF'
import { Router } from 'express';
import { webhookIfood } from './controllers/orderWebhookController';

const router = Router();

// Webhook de pedidos iFood
router.post('/webhook/ifood', webhookIfood);

// Aqui você pode adicionar reprocessos/consultas:
// router.post('/:orderId/retry', retryOrder);

export default router;
EOF
  echo "✅ Criado src/modules/orders/routes.ts"
else
  echo "ℹ️  (skip) src/modules/orders/routes.ts já existe"
fi

# -- EVENTS (polling)
if [ ! -e "src/modules/events/routes.ts" ]; then
  cat > "src/modules/events/routes.ts" <<'EOF'
import { Router } from 'express';
// import { pollEvents } from './controllers/eventsController';

const router = Router();

// Exemplo de polling (implementar controller quando precisar):
// router.get('/poll', pollEvents);

export default router;
EOF
  echo "✅ Criado src/modules/events/routes.ts"
else
  echo "ℹ️  (skip) src/modules/events/routes.ts já existe"
fi

# -- GROCERIES / ITEMS
if [ ! -e "src/modules/groceries/item/routes.ts" ]; then
  mkdir -p src/modules/groceries/item
  cat > "src/modules/groceries/item/routes.ts" <<'EOF'
import { Router } from 'express';
// import { listGroceriesItems } from './controllers/itemController';

const router = Router();

// Exemplo:
// router.get('/', listGroceriesItems);

export default router;
EOF
  echo "✅ Criado src/modules/groceries/item/routes.ts"
else
  echo "ℹ️  (skip) src/modules/groceries/item/routes.ts já existe"
fi

# -- GROCERIES / PICKING
if [ ! -e "src/modules/groceries/picking/routes.ts" ]; then
  mkdir -p src/modules/groceries/picking
  cat > "src/modules/groceries/picking/routes.ts" <<'EOF'
import { Router } from 'express';
// import { startPicking } from './controllers/pickingController';

const router = Router();

// Exemplo:
// router.post('/start', startPicking);

export default router;
EOF
  echo "✅ Criado src/modules/groceries/picking/routes.ts"
else
  echo "ℹ️  (skip) src/modules/groceries/picking/routes.ts já existe"
fi

# 3) agregador de rotas (src/routes/index.ts)
if [ ! -e "src/routes/index.ts" ]; then
  mkdir -p src/routes
  cat > "src/routes/index.ts" <<'EOF'
import { Router } from 'express';
import authenticationRoutes from '../modules/authentication/routes';
import merchantRoutes from '../modules/merchant/routes';
import catalogRoutes from '../modules/catalog/routes';
import orderRoutes from '../modules/orders/routes';
import eventsRoutes from '../modules/events/routes';
import groceriesItemRoutes from '../modules/groceries/item/routes';
import groceriesPickingRoutes from '../modules/groceries/picking/routes';

const router = Router();

if (authenticationRoutes) router.use('/auth', authenticationRoutes);
if (merchantRoutes)       router.use('/merchants', merchantRoutes);
if (catalogRoutes)        router.use('/catalog', catalogRoutes);
if (orderRoutes)          router.use('/orders', orderRoutes);
if (eventsRoutes)         router.use('/events', eventsRoutes);
if (groceriesItemRoutes)  router.use('/groceries/items', groceriesItemRoutes);
if (groceriesPickingRoutes) router.use('/groceries/picking', groceriesPickingRoutes);

export default router;
EOF
  echo "✅ Criado src/routes/index.ts"
else
  echo "ℹ️  (skip) src/routes/index.ts já existe"
fi

echo "🎉 Pronto! Conecte no app.ts com:  app.use(require('./routes').default || require('./routes'));"
