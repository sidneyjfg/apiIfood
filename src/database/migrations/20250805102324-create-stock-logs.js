'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      product_sku: {
        type: Sequelize.STRING
      },
      source: {
        type: Sequelize.ENUM('ERP', 'IFOOD')
      },
      old_quantity: {
        type: Sequelize.INTEGER
      },
      new_quantity: {
        type: Sequelize.INTEGER
      },
      status: {
        type: Sequelize.ENUM('SUCCESS', 'ERROR')
      },
      message: {
        type: Sequelize.TEXT
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stock_logs');
  }
};
