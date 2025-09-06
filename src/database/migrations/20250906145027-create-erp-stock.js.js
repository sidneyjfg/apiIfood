// migration: create-erp-stock.js
module.exports = {
  async up(q) {
    await q.createTable('erp_stock', {
      id: { type: 'BIGINT', primaryKey: true, autoIncrement: true, allowNull: false },
      erp_location_id: { type: 'INT', allowNull: false, references: { model: 'erp_locations', key: 'id' } },
      external_code: { type: 'VARCHAR(255)', allowNull: false },
      on_hand: { type: 'INT', allowNull: false, defaultValue: 0 },
      updated_at: { type: 'DATETIME', allowNull: false, defaultValue: q.sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await q.addConstraint('erp_stock', {
      type: 'unique', fields: ['erp_location_id', 'external_code'], name: 'uniq_erp_stock_loc_sku'
    });
    await q.addIndex('erp_stock', ['external_code'], { name: 'idx_erp_stock_sku' });
    await q.sequelize.query(`ALTER TABLE erp_stock MODIFY updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  },
  async down(q) { await q.dropTable('erp_stock'); }
};
