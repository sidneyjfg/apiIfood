# SQL de Auditoria e Estoque (Multi-loja)
# Como usar: sempre passe o :MERCHANT_ID da loja (e :SKU / :ORDER_ID quando for o caso).

/* 0) VISÃO PRINCIPAL DE ESTOQUE
   Mostra 1 linha por produto: SKU, nome, físico (on_hand),
   quanto está reservado e quanto sobra (available).
*/
CREATE OR REPLACE VIEW product_inventory_view AS
SELECT
  p.id,
  p.product_id,
  p.merchant_id,
  p.external_code AS sku,
  p.ean,
  p.name,
  p.on_hand,
  COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0) AS reserved,
  GREATEST(0, p.on_hand - COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0)) AS available
FROM products p
LEFT JOIN inventory_reservations r
  ON r.merchant_id = p.merchant_id
 AND (r.product_id = p.product_id OR r.product_id = p.id)
GROUP BY
  p.id, p.product_id, p.merchant_id, p.external_code, p.ean, p.name, p.on_hand;

/* 1) ESTOQUE POR SKU (DA LOJA)
   Lista SKU, nome, físico, reservas ativas e o que sobra (available) dessa loja.
*/
SELECT
  p.external_code AS sku,
  p.name,
  p.on_hand,
  COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0) AS reserved_active,
  GREATEST(0, p.on_hand - COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0)) AS available
FROM products p
LEFT JOIN inventory_reservations r
  ON r.merchant_id = p.merchant_id
 AND (r.product_id = p.product_id OR r.product_id = p.id)
WHERE p.merchant_id = :MERCHANT_ID
GROUP BY p.external_code, p.name, p.on_hand
ORDER BY p.external_code;

/* 2) RESERVAS ATIVAS (DETALHADAS)
   Mostra, por SKU, as reservas abertas: canal, pedido, item e quantidade.
*/
SELECT
  p.external_code AS sku,
  r.channel,
  r.order_id,
  r.item_key,
  r.qty,
  r.state,
  r.created_at,
  r.updated_at
FROM products p
JOIN inventory_reservations r
  ON r.merchant_id = p.merchant_id
 AND (r.product_id = p.product_id OR r.product_id = p.id)
WHERE r.state = 'ACTIVE'
  AND p.merchant_id = :MERCHANT_ID
ORDER BY p.external_code, r.created_at DESC;

/* 3) ITENS DE PEDIDO (PAINEL)
   Lista os itens dos pedidos da loja (quantidades, estado e último evento).
*/
SELECT
  oi.merchant_id,
  oi.order_id,
  oi.external_code AS sku,
  oi.name,
  oi.quantity      AS qty_pedido,
  oi.reserved_qty,
  oi.concluded_qty,
  oi.cancelled_qty,
  oi.state,
  oi.last_event_code,
  oi.last_event_at
FROM order_items oi
WHERE oi.merchant_id = :MERCHANT_ID
  AND (:ORDER_ID IS NULL OR oi.order_id = :ORDER_ID)
ORDER BY oi.order_id, oi.external_code;

/* 4) ALERTAS DE CONSISTÊNCIA
   A) Itens CANCELLED sem reserva registrada.
   B) Itens CONCLUDED sem reserva registrada.
*/
SELECT
  oi.merchant_id, oi.order_id, oi.external_code AS sku,
  oi.state, oi.reserved_qty, oi.cancelled_qty,
  oi.last_event_code, oi.last_event_at
FROM order_items oi
WHERE oi.merchant_id = :MERCHANT_ID
  AND oi.state = 'CANCELLED'
  AND COALESCE(oi.reserved_qty, 0) = 0;

SELECT
  oi.merchant_id, oi.order_id, oi.external_code AS sku,
  oi.state, oi.reserved_qty, oi.concluded_qty,
  oi.last_event_code, oi.last_event_at
FROM order_items oi
WHERE oi.merchant_id = :MERCHANT_ID
  AND oi.state = 'CONCLUDED'
  AND COALESCE(oi.reserved_qty, 0) = 0;

/* 5) CONFERIR AVAILABLE x RESERVAS
   Recalcula o available usando reservas ativas consolidadas e compara.
*/
SELECT
  p.merchant_id,
  p.external_code AS sku,
  p.on_hand,
  COALESCE(r.reserved_active, 0) AS reserved_active,
  GREATEST(0, p.on_hand - COALESCE(r.reserved_active, 0)) AS available_calc
FROM products p
LEFT JOIN (
  SELECT
    r.merchant_id,
    r.product_id,
    SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END) AS reserved_active
  FROM inventory_reservations r
  GROUP BY r.merchant_id, r.product_id
) r
  ON r.merchant_id = p.merchant_id
 AND (r.product_id = p.product_id OR r.product_id = p.id)
WHERE p.merchant_id = :MERCHANT_ID
ORDER BY p.external_code;

/* 6) RESUMO DOS LOGS
   Variações registradas em logs por SKU (reservas, cancelamentos, baixas).
*/
SELECT
  merchant_id,
  product_sku AS sku,
  SUM(CASE WHEN message LIKE 'Reserva%' OR message LIKE 'Reservado%' THEN COALESCE(new_quantity,0) - COALESCE(old_quantity,0) ELSE 0 END) AS delta_reserva,
  SUM(CASE WHEN message LIKE 'Cancelamento%' THEN COALESCE(new_quantity,0) - COALESCE(old_quantity,0) ELSE 0 END) AS delta_cancel,
  SUM(CASE WHEN message LIKE 'Baixa%' THEN COALESCE(new_quantity,0) - COALESCE(old_quantity,0) ELSE 0 END) AS delta_baixa,
  COUNT(*) AS total_logs
FROM stock_logs
WHERE merchant_id = :MERCHANT_ID
GROUP BY merchant_id, product_sku
ORDER BY product_sku;

/* 7) LINHA DO TEMPO DO SKU
   Mostra os logs (mais recentes primeiro) de um SKU específico.
*/
SELECT
  created_at,
  source,
  status,
  message,
  old_quantity,
  new_quantity,
  (COALESCE(new_quantity,0) - COALESCE(old_quantity,0)) AS delta
FROM stock_logs
WHERE merchant_id = :MERCHANT_ID
  AND product_sku = :SKU
ORDER BY created_at DESC;

/* 8) ESTOQUE ATUAL x ÚLTIMO LOG
   Compara o on_hand do produto com o último valor logado.
*/
SELECT
  p.merchant_id,
  p.external_code AS sku,
  p.on_hand AS on_hand_atual,
  sl.new_quantity AS on_hand_logado_ultimo,
  (p.on_hand - COALESCE(sl.new_quantity, 0)) AS diferenca
FROM products p
LEFT JOIN (
  SELECT t.merchant_id, t.product_sku, t.new_quantity
  FROM stock_logs t
  JOIN (
    SELECT merchant_id, product_sku, MAX(created_at) AS max_created
    FROM stock_logs
    GROUP BY merchant_id, product_sku
  ) m
      ON m.merchant_id = t.merchant_id
     AND m.product_sku = t.product_sku
     AND m.max_created = t.created_at
) sl
    ON sl.merchant_id = p.merchant_id
   AND sl.product_sku = p.external_code
WHERE p.merchant_id = :MERCHANT_ID
ORDER BY p.external_code;

/* 9) RESERVAS ATIVAS SEM ITEM DE PEDIDO
   Achados de reservas sem ordem/item correspondente.
*/
SELECT
  r.merchant_id,
  r.product_id,
  r.channel,
  r.order_id,
  r.item_key,
  r.qty,
  r.state,
  r.created_at
FROM inventory_reservations r
LEFT JOIN order_items oi
  ON oi.merchant_id = r.merchant_id
 AND oi.order_id    = r.order_id
 AND (oi.unique_id  = r.item_key OR oi.external_code = r.item_key)
WHERE r.merchant_id = :MERCHANT_ID
  AND r.state = 'ACTIVE'
  AND oi.id IS NULL
ORDER BY r.created_at DESC;

/* 10) ITENS COM RESERVA "FANTASMA"
   Itens que têm reserved_qty > 0, mas não existe reserva ativa ligada a eles.
*/
SELECT
  oi.merchant_id,
  oi.order_id,
  oi.external_code AS sku,
  oi.unique_id,
  oi.state,
  oi.reserved_qty,
  oi.last_event_code,
  oi.last_event_at
FROM order_items oi
LEFT JOIN inventory_reservations r
  ON r.merchant_id = oi.merchant_id
 AND r.order_id    = oi.order_id
 AND r.state       = 'ACTIVE'
 AND (r.item_key   = oi.unique_id OR r.item_key = oi.external_code)
WHERE oi.merchant_id = :MERCHANT_ID
  AND COALESCE(oi.reserved_qty, 0) > 0
  AND r.id IS NULL
ORDER BY oi.last_event_at DESC;

/* 11) CONFERÊNCIA DE UM PEDIDO
   Mostra available calculado dos SKUs daquele pedido.
*/
SELECT
  oi.merchant_id,
  oi.order_id,
  oi.external_code AS sku,
  p.on_hand,
  COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0) AS reserved_active,
  GREATEST(0, p.on_hand - COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0)) AS available
FROM order_items oi
JOIN products p
  ON p.merchant_id  = oi.merchant_id
 AND p.external_code = oi.external_code
LEFT JOIN inventory_reservations r
  ON r.merchant_id = p.merchant_id
 AND (r.product_id = p.product_id OR r.product_id = p.id)
WHERE oi.merchant_id = :MERCHANT_ID
  AND oi.order_id = :ORDER_ID
GROUP BY oi.merchant_id, oi.order_id, oi.external_code, p.on_hand
ORDER BY oi.external_code;

/* 12) TOP SKUs MAIS RESERVADOS
   Traz os 20 SKUs com maior reserva ativa na loja.
*/
SELECT
  piv.merchant_id,
  piv.sku,
  piv.name,
  piv.on_hand,
  piv.reserved,
  piv.available
FROM product_inventory_view piv
WHERE piv.merchant_id = :MERCHANT_ID
ORDER BY piv.reserved DESC
LIMIT 20;

/* ÍNDICES SUGERIDOS (melhorar performance e evitar duplicidades)
products:
  UNIQUE (merchant_id, external_code)
  UNIQUE (merchant_id, product_id)
  UNIQUE (merchant_id, ean) [opcional]

inventory_reservations:
  INDEX  (merchant_id, product_id, state)
  UNIQUE (merchant_id, channel, order_id, item_key)  [se possível]
  ou INDEX (merchant_id, order_id, item_key, state)

order_items:
  UNIQUE (merchant_id, order_id, external_code)
  INDEX  (merchant_id, order_id)
  INDEX  (merchant_id, external_code)

stock_logs:
  INDEX  (merchant_id, product_sku, created_at)
*/
