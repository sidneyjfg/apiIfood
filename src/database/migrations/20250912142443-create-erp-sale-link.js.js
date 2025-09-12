'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('erp_sale_links', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      merchant_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      order_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      idempotency_key: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      erp_sale_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      erp_sale_codigo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cliente_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      loja_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true, // 'CREATED' | 'CANCELLED' | 'FINALIZED' etc.
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('erp_sale_links', ['merchant_id', 'order_id'], {
      unique: true,
      name: 'ux_erp_sale_links_merchant_order',
    });

    await queryInterface.addIndex('erp_sale_links', ['idempotency_key'], {
      unique: true,
      name: 'ux_erp_sale_links_idem_key',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('erp_sale_links');
  },
};
