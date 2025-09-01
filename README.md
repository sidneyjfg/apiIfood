# 🛠️ API de Integração iFood ↔ ERP – Controle de Estoque

Este projeto integra a plataforma **iFood** com um **ERP**, permitindo controle **bidirecional de estoque**, **pedidos**, e **produtos**, com base sólida e escalável em **Node.js + TypeScript + Sequelize + MySQL**.

---

## 🚀 Tecnologias Utilizadas

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Express](https://expressjs.com/)
- [Sequelize](https://sequelize.org/)
- [MySQL](https://www.mysql.com/)
- [dotenv](https://github.com/motdotla/dotenv)
- [Swagger](https://swagger.io/tools/swagger-ui/)

---

## 📁 Estrutura de Pastas

```bash
src/
├── config/             # Configuração do banco, Sequelize, Swagger
├── controllers/        # Webhooks e APIs
├── database/
│   ├── migrations/     # Migrations Sequelize
│   ├── models/         # Models Sequelize
├── routes/             # Rotas da aplicação
├── services/           # Integração iFood/ERP
├── utils/              # Funções auxiliares (estoque, snapshot, etc.)
├── types/              # Tipagens personalizadas
├── app.ts              # Configuração do Express
└── index.ts            # Inicialização da API
```

---

## ⚙️ Configuração do Ambiente (.env)

```env
PORT=3000
DB_HOST=localhost
DB_USER=sidney_user
DB_PASS=senha123
DB_NAME=ifood_erp

IFOOD_CLIENT_ID=seu_client_id
IFOOD_CLIENT_SECRET=sua_secret_key
```

---

## 🗃️ Banco de Dados (MySQL)

### ✅ Usuário e banco criados:

```sql
CREATE DATABASE ifood_erp;
CREATE USER 'sidney_user'@'localhost' IDENTIFIED BY 'senha123';
GRANT ALL PRIVILEGES ON ifood_erp.* TO 'sidney_user'@'localhost';
FLUSH PRIVILEGES;
```

### ✅ Migrations principais:

- `products` – Cadastro de produtos (`on_hand` unificado, sem `reserved_quantity`)
- `orders` – Snapshot dos pedidos
- `order_items` – Itens do pedido com controle de estado (`NEW`, `RESERVED`, `CONCLUDED`, `CANCELLED`)
- `stock_logs` – Logs de movimentação de estoque
- `auth_tokens` – Tokens OAuth do iFood

Rodar com:

```bash
npx sequelize-cli db:migrate
```

---

## 📦 Models Sequelize (TypeScript)

- `Product` → Estoque físico (`on_hand`)  
- `Order` → Snapshot de pedidos iFood  
- `OrderItem` → Itens do pedido (com rastreio de estado e quantidades)  
- `StockLog` → Auditoria de movimentações  
- `AuthToken` → Tokens OAuth iFood  

---

## 📡 Webhook de Pedidos iFood

Rota configurada:

```
POST /webhook/ifood
```

Exemplo de payload:

```json
{
  "id": "123",
  "items": [
    {
      "name": "Pizza",
      "quantity": 2,
      "externalCode": "SKU123"
    }
  ]
}
```

---

## 🔄 Fluxo de Estoque iFood ↔ ERP

- **Reserva (`PLC`)** → baixa provisória em `on_hand` + incrementa `reserved_qty` no `order_items`
- **Cancelamento (`CAN`)** → libera estoque caso tenha sido reservado
- **Conclusão (`CON`)** → baixa definitiva do pedido (se já reservado)  
- **Snapshot (`saveOrderSnapshot`)** → grava pedidos e itens antes de movimentar estoque (auditoria)

> **Importante:**  
Pedidos que chegam **cancelados sem reserva** não movimentam estoque, evitando inconsistências.

---

## 📚 Documentação com Swagger

```
http://localhost:3000/docs
```

Configurado com `swagger-jsdoc` + `swagger-ui-express`.

---

## 🚀 Iniciar o projeto

### 1. Instalar dependências

```bash
npm install
```

### 2. Rodar migrations

```bash
npx sequelize-cli db:migrate
```

### 3. Rodar servidor em modo dev

```bash
npm run dev
```

---

## 📝 Auditoria de Estoque

Consultas SQL úteis estão em [`sqlsEstoque.sql`](./src/database/sqlsEstoque.sql)  
Inclui relatórios de **estoque x reservas**, **logs de movimentações** e **consistência de pedidos**.

---

## 🔜 Próximos passos

- [x] Integração OAuth iFood  
- [x] Controle de estoque unificado (`on_hand`)  
- [x] Snapshot de pedidos e itens  
- [x] Logs detalhados de movimentação  
- [ ] Job de sincronização ERP → iFood  
- [ ] CRUD de produtos e painel de visualização  
- [ ] Reprocessamento de erros de pedidos e sincronizações  

---

## 🧑‍💻 Autor

Desenvolvido por Sidney 🚀
