Pontos que ainda faltam para homologação
## 1. Pedidos / Events

 > Polling completo (GET /events:polling a cada 30s) com x-polling-merchants e POST /events/acknowledgment. (Você só implementou webhook; homologação exige validar também polling, mesmo que use webhooks em produção).

  - Cancelamento com motivo → consultar /cancellationReasons e permitir escolha do motivo no ERP.
  - Agendamento (SCHEDULED) → precisa exibir data/hora do pedido agendado.
  - Pagamento em dinheiro/cartão → mostrar troco e bandeira.
  - Cupons de desconto → mostrar valor e responsável (iFood/Loja).
  - Observações de itens e delivery.observations → exibir na tela/comanda.
  - Código de coleta (pickup code) → exibir na tela/comanda.
  - Eventos duplicados → descartar se já processado.
  - Eventos do Gestor de Pedidos → sincronizar status caso outro app confirme/cancele.
  - Plataforma de Negociação de Pedidos → processar eventos.
  - CPF/CNPJ no pedido → exibir ou preencher no fiscal quando obrigatório.
 
## 2. Catálogo

 - Implementar POST /categories para criar categorias.
 - PUT /items para criar/editar item completo.
 - PATCH /items/price e /items/status para alterar preço e ativar/desativar item.
 - PATCH /options/price e /options/status para complementos.
 - POST /image/upload para imagens.
 - Evidência de cardápio (item com nome, descrição, preço e imagem).

3. Item (v1.0 ingestion)

 - Implementar POST /item/v1.0/ingestion/{merchantId}?reset=false para integração/reativação de itens.
 - PATCH /item/v1.0/ingestion/{merchantId} para alterações parciais.

## 4. Não funcionais

 - Token refresh → renovar só perto do vencimento.
 - Rate limiting → respeitar limites de requisições.
 - (Desejável) Comanda impressa no layout sugerido pelo iFood.