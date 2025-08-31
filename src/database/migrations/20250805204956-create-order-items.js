'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('order_items', {
      id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      order_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      order_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      index: Sequelize.INTEGER,
      item_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      unique_id: Sequelize.STRING,
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      external_code: Sequelize.STRING,
      type: Sequelize.STRING,
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      unit: Sequelize.STRING,
      unit_price: Sequelize.FLOAT,
      options_price: Sequelize.FLOAT,
      total_price: Sequelize.FLOAT,
      price: Sequelize.FLOAT,
      observations: Sequelize.TEXT,
      image_url: Sequelize.STRING,
      options: Sequelize.JSON, // MySQL aceita JSON (sem o "B")
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('order_items');
  }
};
