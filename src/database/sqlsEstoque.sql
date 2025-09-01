
# SQL Scripts para Auditoria e Controle de Estoque

-- 0) View canônica do estoque
-- Cria uma visão que consolida on_hand, reservas ativas e available. Útil como consulta principal rápida.
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
  ON (r.product_id = p.product_id OR r.product_id = p.id)
GROUP BY p.id, p.product_id, p.merchant_id, p.external_code, p.ean, p.name, p.on_hand;

-- 1) Visão geral por SKU
-- Mostra on_hand, reservas ativas e disponível. Boa para ver a saúde do estoque por produto.
SELECT
  p.external_code AS sku,
  p.name,
  p.on_hand,
  COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0) AS reserved_active,
  GREATEST(0, p.on_hand - COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0)) AS available
FROM products p
LEFT JOIN inventory_reservations r
  ON (r.product_id = p.product_id OR r.product_id = p.id)
GROUP BY p.external_code, p.name, p.on_hand
ORDER BY p.external_code;

-- 2) Detalhe de reservas ativas por SKU/pedido
-- Ajuda a rastrear exatamente quais pedidos estão reservando unidades de um produto.
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
  ON (r.product_id = p.product_id OR r.product_id = p.id)
WHERE r.state = 'ACTIVE'
ORDER BY p.external_code, r.created_at DESC;

-- 3) Painel por pedido
-- Mostra o estado e quantidades de cada item em um pedido específico.
SELECT
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
ORDER BY oi.order_id, oi.external_code;

-- 4) Auditoria de consistência
-- Identifica pedidos cancelados ou concluídos sem reservas, possíveis inconsistências de fluxo.
SELECT oi.order_id, oi.external_code AS sku, oi.state, oi.reserved_qty, oi.cancelled_qty, oi.last_event_code, oi.last_event_at
FROM order_items oi
WHERE oi.state = 'CANCELLED'
  AND COALESCE(oi.reserved_qty, 0) = 0;

SELECT oi.order_id, oi.external_code AS sku, oi.state, oi.reserved_qty, oi.concluded_qty, oi.last_event_code, oi.last_event_at
FROM order_items oi
WHERE oi.state = 'CONCLUDED'
  AND COALESCE(oi.reserved_qty, 0) = 0;

-- 5) Conciliar available com reservas
-- Calcula available como on_hand - reservas e compara com banco.
SELECT
  p.external_code AS sku,
  p.on_hand,
  COALESCE(r.reserved_active, 0) AS reserved_active,
  GREATEST(0, p.on_hand - COALESCE(r.reserved_active, 0)) AS available_calc
FROM products p
LEFT JOIN (
  SELECT r.product_id AS r_product_key, SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END) AS reserved_active
  FROM inventory_reservations r
  GROUP BY r.product_id
) r
  ON (r.r_product_key = p.product_id OR r.r_product_key = p.id)
ORDER BY p.external_code;

-- 6) Resumo dos logs
-- Dá uma visão histórica do efeito de reservas/cancelamentos/conclusões por SKU.
SELECT
  product_sku AS sku,
  SUM(CASE WHEN message LIKE 'Reserva%' OR message LIKE 'Reservado%' THEN new_quantity - old_quantity ELSE 0 END) AS delta_reserva,
  SUM(CASE WHEN message LIKE 'Cancelamento%' THEN new_quantity - old_quantity ELSE 0 END) AS delta_cancel,
  SUM(CASE WHEN message LIKE 'Baixa%' THEN new_quantity - old_quantity ELSE 0 END) AS delta_baixa,
  COUNT(*) AS total_logs
FROM stock_logs
GROUP BY product_sku
ORDER BY product_sku;

-- 7) Linha do tempo de um SKU
-- Útil para investigar toda a movimentação de estoque de um produto ao longo do tempo.
SELECT
  created_at,
  source,
  status,
  message,
  old_quantity,
  new_quantity,
  (new_quantity - old_quantity) AS delta
FROM stock_logs
WHERE product_sku = :SKU
ORDER BY created_at DESC;

-- 8) Diferença entre estoque atual e último log
-- Permite detectar divergências entre o valor salvo no produto e o último log registrado.
SELECT
  p.external_code AS sku,
  p.on_hand AS on_hand_atual,
  sl.new_quantity AS on_hand_logado_ultimo,
  (p.on_hand - sl.new_quantity) AS diferenca
FROM products p
LEFT JOIN (
  SELECT t.product_sku, t.new_quantity
  FROM stock_logs t
  JOIN (
    SELECT product_sku, MAX(created_at) AS max_created
    FROM stock_logs
    GROUP BY product_sku
  ) m
    ON m.product_sku = t.product_sku AND m.max_created = t.created_at
) sl
  ON sl.product_sku = p.external_code
ORDER BY p.external_code;

-- 9) Reservas ativas sem item correspondente
-- Detecta reservas que não têm item de pedido associado, indicando possíveis registros órfãos.
SELECT
  r.product_id,
  r.channel,
  r.order_id,
  r.item_key,
  r.qty,
  r.state,
  r.created_at
FROM inventory_reservations r
LEFT JOIN order_items oi
  ON oi.order_id = r.order_id AND (oi.unique_id = r.item_key OR oi.external_code = r.item_key)
WHERE r.state = 'ACTIVE'
  AND oi.id IS NULL
ORDER BY r.created_at DESC;

-- 10) Itens reservados sem reserva ativa
-- Detecta order_items que têm reserved_qty > 0 mas não possuem reserva ativa vinculada.
SELECT
  oi.order_id,
  oi.external_code AS sku,
  oi.unique_id,
  oi.state,
  oi.reserved_qty,
  oi.last_event_code,
  oi.last_event_at
FROM order_items oi
LEFT JOIN inventory_reservations r
  ON r.order_id = oi.order_id
  AND r.state = 'ACTIVE'
  AND (r.item_key = oi.unique_id OR r.item_key = oi.external_code)
WHERE COALESCE(oi.reserved_qty, 0) > 0
  AND r.id IS NULL
ORDER BY oi.last_event_at DESC;

-- 11) Conferência de um pedido específico
-- Mostra estoque atual e reservas ativas de todos os itens de um pedido.
SELECT
  oi.order_id,
  oi.external_code AS sku,
  p.on_hand,
  COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0) AS reserved_active,
  GREATEST(0, p.on_hand - COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0)) AS available
FROM order_items oi
JOIN products p ON p.external_code = oi.external_code
LEFT JOIN inventory_reservations r
  ON (r.product_id = p.product_id OR r.product_id = p.id)
GROUP BY oi.order_id, oi.external_code, p.on_hand
HAVING oi.order_id = :ORDER_ID;

-- 12) Top SKUs com maior reserva ativa
-- Útil para gestão, identifica rapidamente produtos com mais estoque comprometido em reservas.
SELECT
  piv.sku,
  piv.name,
  piv.on_hand,
  piv.reserved,
  piv.available
FROM product_inventory_view piv
ORDER BY piv.reserved DESC
LIMIT 20;
