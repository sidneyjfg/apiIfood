'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // NOT NULL
    await queryInterface.changeColumn('auth_tokens', 'merchant_id', { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn('inventory_reservations', 'merchant_id', { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn('order_items', 'merchant_id', { type: Sequelize.STRING, allowNull: false });
    await queryInterface.changeColumn('stock_logs', 'merchant_id', { type: Sequelize.STRING, allowNull: false });

    // AUTH TOKENS unique por loja+provider
    await queryInterface.addConstraint('auth_tokens', {
      fields: ['merchant_id', 'provider'],
      type: 'unique',
      name: 'uq_auth_tokens_merchant_provider'
    });

    // PRODUCTS unique por loja
    await queryInterface.removeIndex('products', 'idx_prod_merchant_external');
    await queryInterface.addIndex('products', ['merchant_id', 'external_code'], { name: 'uq_prod_merchant_external', unique: true });

    await queryInterface.removeIndex('products', 'idx_prod_merchant_productid');
    await queryInterface.addIndex('products', ['merchant_id', 'product_id'], { name: 'uq_prod_merchant_productid', unique: true });

    // opcional
    await queryInterface.removeIndex('products', 'idx_prod_merchant_ean');
    await queryInterface.addIndex('products', ['merchant_id', 'ean'], { name: 'uq_prod_merchant_ean', unique: true, where: { ean: { [Sequelize.Op.ne]: null } } });

    // ORDER_ITEMS unique por loja+pedido+external_code
    // 1) Remover unique antigo, se existir
    try { await queryInterface.removeConstraint('order_items', 'uq_order_items_order_external'); } catch (e) {}
    // 2) Adicionar novo
    await queryInterface.addConstraint('order_items', {
      fields: ['merchant_id', 'order_id', 'external_code'],
      type: 'unique',
      name: 'uq_order_items_merchant_order_external'
    });

    // INVENTORY_RESERVATIONS unique por loja+canal+order+item (substitui unique anterior)
    try { await queryInterface.removeIndex('inventory_reservations', 'uq_res_channel_order_item'); } catch (e) {}
    await queryInterface.addIndex('inventory_reservations', ['merchant_id', 'channel', 'order_id', 'item_key'], {
      name: 'uq_res_merchant_channel_order_item', unique: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint('auth_tokens', 'uq_auth_tokens_merchant_provider');

    await queryInterface.removeIndex('products', 'uq_prod_merchant_external');
    await queryInterface.addIndex('products', ['merchant_id', 'external_code'], { name: 'idx_prod_merchant_external', unique: false });

    await queryInterface.removeIndex('products', 'uq_prod_merchant_productid');
    await queryInterface.addIndex('products', ['merchant_id', 'product_id'], { name: 'idx_prod_merchant_productid', unique: false });

    await queryInterface.removeIndex('products', 'uq_prod_merchant_ean');
    await queryInterface.addIndex('products', ['merchant_id', 'ean'], { name: 'idx_prod_merchant_ean', unique: false });

    await queryInterface.removeConstraint('order_items', 'uq_order_items_merchant_order_external');
    await queryInterface.addConstraint('order_items', {
      fields: ['order_id', 'external_code'],
      type: 'unique',
      name: 'uq_order_items_order_external'
    });

    await queryInterface.removeIndex('inventory_reservations', 'uq_res_merchant_channel_order_item');
    await queryInterface.addIndex('inventory_reservations', ['channel', 'order_id', 'item_key'], { name: 'uq_res_channel_order_item', unique: true });
  }
};