'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      external_code: { // antigo sku
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      product_id: { // antigo ifood_sku, vindo de productId
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      image_path: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ean: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      price: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      quantity: { // representa o estoque
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: { // substitui o campo active
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'AVAILABLE',
      },
      selling_option_minimum: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      selling_option_incremental: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      synced_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      merchant_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
  },
};
