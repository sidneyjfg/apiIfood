'use strict';

const VIEW_NAME = 'product_inventory_view';

const createViewSQL = `
CREATE OR REPLACE VIEW ${VIEW_NAME} AS
SELECT
  p.id,
  p.product_id,                 -- se existir essa coluna, senão remova
  p.external_code AS sku,
  p.ean,
  p.quantity AS on_hand,        -- mantém seu 'quantity' como físico por enquanto
  COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0) AS reserved,
  GREATEST(0, (p.quantity - COALESCE(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0))) AS available
FROM products p
LEFT JOIN inventory_reservations r
  ON r.product_id = p.product_id OR r.product_id = p.id -- ajuste conforme seu schema
GROUP BY p.id, p.product_id, p.external_code, p.ean, p.quantity
`;

const dropViewSQL = `DROP VIEW IF EXISTS ${VIEW_NAME}`;

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(createViewSQL);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(dropViewSQL);
  }
};
