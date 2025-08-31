'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      display_id: Sequelize.STRING,
      customer_name: Sequelize.STRING,
      customer_document: Sequelize.STRING,
      customer_phone: Sequelize.STRING,
      customer_email: Sequelize.STRING,
      order_type: Sequelize.STRING,
      order_timing: Sequelize.STRING,
      sales_channel: Sequelize.STRING,
      delivery_mode: Sequelize.STRING,
      delivery_description: Sequelize.STRING,
      delivered_by: Sequelize.STRING,
      delivery_datetime: Sequelize.DATE,
      preparation_start: Sequelize.DATE,
      delivery_street: Sequelize.STRING,
      delivery_number: Sequelize.STRING,
      delivery_neighborhood: Sequelize.STRING,
      delivery_city: Sequelize.STRING,
      delivery_state: Sequelize.STRING,
      delivery_postal_code: Sequelize.STRING,
      delivery_country: Sequelize.STRING,
      delivery_reference: Sequelize.STRING,
      delivery_complement: Sequelize.STRING,
      delivery_observations: Sequelize.TEXT,
      merchant_id: Sequelize.STRING,
      merchant_name: Sequelize.STRING,
      subtotal: Sequelize.FLOAT,
      delivery_fee: Sequelize.FLOAT,
      additional_fees: Sequelize.FLOAT,
      total: Sequelize.FLOAT,
      is_test: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
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
    await queryInterface.dropTable('orders');
  }
};
