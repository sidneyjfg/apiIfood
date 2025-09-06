// migration: create-merchant-erp-mappings.js
module.exports = {
  async up(q) {
    await q.createTable('merchant_erp_mappings', {
      id: { type: 'INT', primaryKey: true, autoIncrement: true, allowNull: false },
      merchant_id: { type: 'VARCHAR(64)', allowNull: false },
      erp_location_id: { type: 'INT', allowNull: false, references: { model: 'erp_locations', key: 'id' } },
      created_at: { type: 'DATETIME', allowNull: false, defaultValue: q.sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: 'DATETIME', allowNull: false, defaultValue: q.sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await q.addConstraint('merchant_erp_mappings', {
      type: 'unique', fields: ['merchant_id'], name: 'uniq_mapping_merchant'
    });
    await q.addIndex('merchant_erp_mappings', ['erp_location_id'], { name: 'idx_mapping_location' });
    await q.sequelize.query(`ALTER TABLE merchant_erp_mappings MODIFY updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  },
  async down(q) { await q.dropTable('merchant_erp_mappings'); }
};
