'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('inventory_reservations', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      product_id: { type: Sequelize.STRING, allowNull: false },
      channel: { type: Sequelize.STRING, allowNull: false }, // 'IFOOD', 'PDV', 'MANUAL', 'LEGACY'...
      order_id: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
      item_key: { type: Sequelize.STRING, allowNull: true, defaultValue: null }, // ex: uniqueId/externalCode
      qty: { type: Sequelize.INTEGER, allowNull: false },
      state: { type: Sequelize.STRING, allowNull: false, defaultValue: 'ACTIVE' }, // ACTIVE|CANCELLED|CONSUMED
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('inventory_reservations', ['product_id'], { name: 'idx_res_product' });
    await queryInterface.addIndex(
      'inventory_reservations',
      ['channel', 'order_id', 'item_key'],
      { name: 'uq_res_channel_order_item', unique: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('inventory_reservations', 'uq_res_channel_order_item').catch(()=>{});
    await queryInterface.removeIndex('inventory_reservations', 'idx_res_product').catch(()=>{});
    await queryInterface.dropTable('inventory_reservations');
  }
};
