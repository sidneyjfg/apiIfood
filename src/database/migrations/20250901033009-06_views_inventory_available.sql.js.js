'use strict';

module.exports = {
  async up(queryInterface) {
    // MySQL 8
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW product_inventory_view AS
      SELECT
        p.merchant_id,
        p.external_code AS sku,
        p.product_id,
        p.on_hand,
        IFNULL(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0) AS reserved,
        GREATEST(p.on_hand - IFNULL(SUM(CASE WHEN r.state = 'ACTIVE' THEN r.qty ELSE 0 END), 0), 0) AS available
      FROM products p
      LEFT JOIN inventory_reservations r
        ON r.merchant_id = p.merchant_id
       AND r.product_id = COALESCE(p.product_id, p.id)
      GROUP BY p.merchant_id, p.external_code, p.product_id, p.on_hand;
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS product_inventory_view;');
  }
};
