'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('order_items', 'merchant_id', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addIndex('order_items', ['merchant_id']);
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('order_items', ['merchant_id']);
    await queryInterface.removeColumn('order_items', 'merchant_id');
  }
};