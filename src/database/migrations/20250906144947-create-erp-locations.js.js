// migration: create-erp-locations.js
module.exports = {
  async up(q) {
    await q.createTable('erp_locations', {
      id: { type: 'INT', primaryKey: true, autoIncrement: true, allowNull: false },
      code: { type: 'VARCHAR(64)', allowNull: false, unique: true },
      name: { type: 'VARCHAR(160)', allowNull: false },
      active: { type: 'TINYINT(1)', allowNull: false, defaultValue: 1 },
      created_at: { type: 'DATETIME', allowNull: false, defaultValue: q.sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: 'DATETIME', allowNull: false, defaultValue: q.sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await q.sequelize.query(`ALTER TABLE erp_locations MODIFY updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  },
  async down(q) { await q.dropTable('erp_locations'); }
};
