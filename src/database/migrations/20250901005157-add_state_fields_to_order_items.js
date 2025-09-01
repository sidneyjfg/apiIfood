'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // novos campos
    await queryInterface.addColumn('order_items', 'state', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'NEW',
    });

    await queryInterface.addColumn('order_items', 'reserved_qty', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('order_items', 'concluded_qty', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('order_items', 'cancelled_qty', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('order_items', 'last_event_code', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('order_items', 'last_event_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // índice único (order_id, external_code)
    await queryInterface.addIndex('order_items', ['order_id', 'external_code'], {
      unique: true,
      name: 'uq_order_items_order_external',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('order_items', 'uq_order_items_order_external');

    await queryInterface.removeColumn('order_items', 'last_event_at');
    await queryInterface.removeColumn('order_items', 'last_event_code');
    await queryInterface.removeColumn('order_items', 'cancelled_qty');
    await queryInterface.removeColumn('order_items', 'concluded_qty');
    await queryInterface.removeColumn('order_items', 'reserved_qty');
    await queryInterface.removeColumn('order_items', 'state');
  },
};