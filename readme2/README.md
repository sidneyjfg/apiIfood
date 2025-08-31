
# 🛠️ API de Integração iFood ↔ ERP – Controle de Estoque

Este projeto tem como objetivo integrar a plataforma **iFood** com um **ERP**, permitindo controle bidirecional de **estoque**, **pedidos**, e **produtos**, com uma base sólida e escalável usando **Node.js + TypeScript + Sequelize + MySQL**.

---

## 🚀 Tecnologias Utilizadas

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Express](https://expressjs.com/)
- [Sequelize](https://sequelize.org/)
- [MySQL](https://www.mysql.com/)
- [dotenv](https://github.com/motdotla/dotenv)
- [Swagger](https://swagger.io/tools/swagger-ui/) (via swagger-jsdoc)

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
├── services/           # Lógica externa (iFood, ERP)
├── utils/              # Funções auxiliares
├── types/              # Tipagens personalizadas (.d.ts)
├── app.ts              # Configuração principal do Express
└── index.ts            # Inicialização da API
```

---

## ⚙️ Configuração do Ambiente (.env)

Crie um arquivo `.env` com as seguintes variáveis:

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

### ✅ Migrations disponíveis:

- `products` – Cadastro de produtos
- `stock_logs` – Logs de movimentação de estoque
- `auth_tokens` – Armazena tokens OAuth do iFood

> Rodar com:

```bash
npx sequelize-cli db:migrate
```

---

## 📦 Models Sequelize criados (com TypeScript)

- `Product` → Representa os produtos sincronizados
- `StockLog` → Representa logs de entrada/baixa de estoque
- `AuthToken` → Representa o token OAuth do iFood

> Todos os models ficam em `src/database/models/`

---

## 📡 Webhook de Pedidos iFood

Rota configurada:

```
POST /webhook/ifood
```

Exemplo de payload esperado:

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

## 📚 Documentação com Swagger

- Documentação acessível em:

```
http://localhost:3000/docs
```

> Swagger configurado com `swagger-jsdoc` + `swagger-ui-express`.

> Arquivo de tipagem criado em:  
`src/types/swagger-jsdoc.d.ts` para resolver erro do TypeScript.

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

## 🔜 Próximos passos

- Criar serviço de autenticação com a API do iFood
- Criar job de sincronização ERP → iFood (estoque)
- Criar CRUD de produtos e painel de visualização
- Tratar reprocessamento de erros de pedidos e sincronizações

---

## 🧑‍💻 Autor

Desenvolvido por Sidney com suporte do ChatGPT
