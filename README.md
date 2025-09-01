# 🛠️ API de Integração iFood ↔ ERP — Multi-Loja & Controle de Estoque

Integração entre **iFood** e **ERP** com suporte a **múltiplas lojas (merchantId)**. A API processa **pedidos** e controla **estoque publicado** no iFood de forma **idempotente** por loja, com base em **Node.js + TypeScript + Express + Sequelize + MySQL**.

## 🚀 Tecnologias

- Node.js, TypeScript, Express  
- Sequelize (ORM), MySQL 8+  
- dotenv, Swagger (swagger-jsdoc + swagger-ui-express)

## 🧭 Multi-Loja (merchantId)

- Todas as entidades relevantes possuem `merchant_id`.  
- Tokens OAuth são salvos por loja (`auth_tokens`: **UNIQUE (merchant_id, provider)**).  
- Produtos e reservas são isolados por loja:
  - `products`: **UNIQUE (merchant_id, external_code)** e **UNIQUE (merchant_id, product_id)**  
  - `inventory_reservations`: sempre com `merchant_id`, `product_id` (preferir o **productId do iFood**)  
- Todos os **endpoints iFood** usam a URL com `.../merchants/{merchantId}/...`.

> Regra de ouro: **todas as queries** app-side devem filtrar por `merchant_id`.

## 📁 Estrutura

```
src/
├─ config/            # banco, sequelize, swagger
├─ controllers/       # webhooks e apis
├─ database/
│  ├─ migrations/     # migrations sequelize
│  └─ models/         # models sequelize
├─ routes/            # rotas express
├─ services/          # ifood auth, catalogo, estoque
├─ utils/             # helpers (snapshot, transitions etc.)
├─ app.ts             # express
└─ index.ts           # bootstrap
```

## ⚙️ .env

```env
PORT=3000
DB_HOST=localhost
DB_USER=sidney_user
DB_PASS=senha123
DB_NAME=ifood_erp

IFOOD_CLIENT_ID=seu_client_id
IFOOD_CLIENT_SECRET=sua_secret_key
```

## 🗃️ Banco (MySQL)

Criação básica:

```sql
CREATE DATABASE ifood_erp;
CREATE USER 'sidney_user'@'localhost' IDENTIFIED BY 'senha123';
GRANT ALL PRIVILEGES ON ifood_erp.* TO 'sidney_user'@'localhost';
FLUSH PRIVILEGES;
```

### Índices recomendados

- `products`:  
  - UNIQUE (`merchant_id`, `external_code`)  
  - UNIQUE (`merchant_id`, `product_id`)  
  - (opcional) UNIQUE (`merchant_id`, `ean`)
- `inventory_reservations`:  
  - INDEX  (`merchant_id`, `product_id`, `state`)  
  - UNIQUE (`merchant_id`, `channel`, `order_id`, `item_key`) **ou** INDEX (`merchant_id`, `order_id`, `item_key`, `state`)
- `order_items`:  
  - UNIQUE (`merchant_id`, `order_id`, `external_code`)  
  - INDEX  (`merchant_id`, `order_id`)  
  - INDEX  (`merchant_id`, `external_code`)
- `stock_logs`:  
  - INDEX  (`merchant_id`, `product_sku`, `created_at`)
- `orders`:  
  - INDEX  (`merchant_id`, `status`)  
  - INDEX  (`order_id`)  *(coluna separada para facilitar busca rápida por ordem)*

## 📦 Models (resumo)

- **Product**: catálogo/estoque por loja (`on_hand` = físico; disponível = `on_hand` − reservas ativas).  
- **Order**: snapshot do pedido iFood por loja (campos `status`, `last_event_code`, `last_event_at`, `order_id`).  
- **OrderItem**: estado por item (`NEW` → `RESERVED` → `CONCLUDED` / `CANCELLED`) e contadores.  
- **InventoryReservation**: reservas por (`merchant_id`, `product_id`, `order_id`, `item_key`).  
- **AuthToken**: OAuth por loja (**UNIQUE (`merchant_id`,`provider`)**).  
- **StockLog**: auditoria de estoque por loja.

## 🔄 Fluxo de Estoque (PLC / CAN / CON)

- **PLC (PLACED)**  
  - Cria/garante **reserva ACTIVE** (idempotente por `merchant_id + channel + order_id + item_key`).  
  - Publica `available` no iFood: `on_hand - reservas_ativas`.  
  - Item: `state = RESERVED`, `reserved_qty += qty`.
- **CAN (CANCELLED)**  
  - Se houver reserva ACTIVE → marca `CANCELLED`, publica novo `available`.  
  - Se **não** houver reserva → não mexe físico; apenas item `state = CANCELLED`.
- **CON (CONCLUDED)**  
  - Se houver ACTIVE → **consome** reserva (ACTIVE → CONSUMED), baixa `on_hand`, publica `available` (tende a ficar igual).  
  - Se **não** houver reserva → **não baixa físico**; item `CONCLUDED`.

> Toda publicação ao iFood usa `merchantId` e o **productId do iFood** (não o SKU).

## 📡 Endpoints

- `POST /webhook/ifood`  
  Recebe eventos do iFood. Processa PLC/CAN/CON, salva snapshot (`orders`, `order_items`) e move estoque.

- `GET /ifood/token?merchantId={id}`  
  Retorna token válido por loja (reutiliza se ainda válido).

- `GET /ifood/items/sync?merchantId={id}`  
  Percorre **todos os catálogos da loja**, traz **todas as categorias** com `includeItems=true` e faz **upsert** em `products` (por loja), além de logar mudanças de `on_hand`.

- `GET /ifood/products/external/:externalCode?merchantId={id}`  
  Busca produto no iFood por **externalCode** para a loja.

- `GET /ifood/products/:productId?merchantId={id}`  
  Busca produto no iFood por **productId** para a loja.

## 📚 Swagger

A UI fica em: `http://localhost:3000/docs`

### Especificações (resumo)

- **/ifood/token** (GET)  
  - Query: `merchantId` *(string, required)*  
  - 200: `{ message, access_token, expires_in }`

- **/ifood/items/sync** (GET)  
  - Query: `merchantId` *(string, required)*  
  - 200: `{ message: string, total_inserted: number }`

- **/ifood/products/external/{externalCode}** (GET)  
  - Path: `externalCode` *(string, required)*  
  - Query: `merchantId` *(string, required)*  
  - 200: `{ ...payload do iFood... }`

- **/ifood/products/{productId}** (GET)  
  - Path: `productId` *(string, required)*  
  - Query: `merchantId` *(string, required)*  
  - 200: `{ ...payload do iFood... }`

- **/webhook/ifood** (POST)  
  - Body: evento do iFood (min. `{ code, orderId, merchantId }`)  
  - 200: `{ ok: true }` *(ou logs de fluxo)*

## 🧰 Scripts NPM

```json
{
  "scripts": {
    "dev": "ts-node-dev src/index.ts",
    "start": "tsc && node dist/index.js",
    "db:migrate": "sequelize-cli db:migrate",
    "db:migrate:undo": "sequelize-cli db:migrate:undo",
    "db:migrate:undo:all": "sequelize-cli db:migrate:undo:all",
    "db:migration:new": "sequelize-cli migration:generate --name"
  }
}
```

Uso:

- Migrar: `npm run db:migrate`  
- Desfazer última: `npm run db:migrate:undo`  
- Desfazer tudo: `npm run db:migrate:undo:all`  
- Nova migration: `npm run db:migration:new -- add_orders_status_fields`

## 📝 Auditoria de Estoque (SQL)

- Arquivo com consultas úteis (multi-loja):  
  **`sql-auditoria-multi-loja.txt`** — copie para `docs/sql/` do projeto se quiser versionar.  
- Principais relatórios:
  - **View** `product_inventory_view`  
  - Saúde por SKU / por loja  
  - Detalhe de reservas ativas  
  - Painel por pedido (itens)  
  - Consistência (CON/CAN sem reserva)  
  - Conciliação de `available`  
  - Último log vs estoque atual  
  - Gap de reservas x itens

## 🧪 Boas práticas

- Em `inventory_reservations`, **sempre** gravar `merchant_id` + `product_id` (preferir o **productId do iFood**).  
- Em consultas, **sempre** filtrar por `merchant_id`.  
- Em jobs, iterar `merchants` ativos e isolar execução por loja.  
- Tratar **idempotência** por item/pedido/loja.

## 🆘 Troubleshooting

- **“Specified key was too long”**: reduza VARCHARs em colunas de índices compostos (ex.: `STRING(45)`).  
- **“Duplicate column name”**: suas migrations podem ter sido aplicadas; use `describeTable` + condicionais.  
- **Erros de sintaxe PostgreSQL**: remova casts `::text` e `FROM ... UPDATE` (use `UPDATE ... JOIN` no MySQL).  
- **“WHERE parameter merchant_id undefined”**: verifique se o `merchantId` está sendo passado adiante (controller → service → queries) e se o model inclui o campo.

---

**Autor:** Sidney 🚀
