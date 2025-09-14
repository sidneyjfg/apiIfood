Eventos (events)
Índice único no banco para (merchant_id, event_id): o código trata conflito, mas o modelo não define o índice composto. Recomendo migration criando UNIQUE(merchant_id, event_id) para garantir o de-dupe funcionar 100% em produção.

Pedidos (orders)
ACK por merchant (opcional/defensivo): hoje você usa o token do primeiro merchant para ACK de todos os eventos. Funciona na prática, mas o mais seguro é agrupar por merchantId e ACK com o token correspondente (evita edge cases de permissão).


Autenticação, rate limit e robustez
Padronizar resiliência: em alguns services (p.ex., ifoodCatalogService.ts, ifoodEventsPollingService.ts) as chamadas axios vão “cruas”. Se quiser bater 100% do requisito não-funcional, envolva todas as chamadas iFood com o mesmo wrapper de retry/limiter.

Merchant (status, interrupções, horário)
Observação:

GET /merchants/{merchantId} (detalhe da loja): não vi explicitamente um método dedicado a esse endpoint; se a auditoria pedir, é simples adicionar (pattern igual ao dos outros GETs).