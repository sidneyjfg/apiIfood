'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('order_items');

    if (!table.ean) {
      await queryInterface.addColumn('order_items', 'ean', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      // Índice auxiliar para consultas por EAN (não-único)
      await queryInterface.addIndex('order_items', ['ean'], {
        name: 'idx_order_items_ean',
        unique: false,
      });
    }
  },

  async down(queryInterface/*, Sequelize*/) {
    await queryInterface.removeIndex('order_items', 'idx_order_items_ean').catch(()=>{});
    await queryInterface.removeColumn('order_items', 'ean').catch(()=>{});
  }
};
