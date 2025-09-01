'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stock_logs', 'merchant_id', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addIndex('stock_logs', ['merchant_id', 'product_sku'], { name: 'idx_stock_logs_merchant_sku' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('stock_logs', 'idx_stock_logs_merchant_sku');
    await queryInterface.removeColumn('stock_logs', 'merchant_id');
  }
};