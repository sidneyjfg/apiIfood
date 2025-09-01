'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // garantir colunas existentes
    await queryInterface.changeColumn('products', 'merchant_id', { type: Sequelize.STRING, allowNull: false });

    // índices únicos por loja (criar como NON-UNIQUE agora se preferir; tornamos UNIQUE na fase B)
    await queryInterface.addIndex('products', ['merchant_id', 'external_code'], { name: 'idx_prod_merchant_external', unique: false });
    await queryInterface.addIndex('products', ['merchant_id', 'product_id'], { name: 'idx_prod_merchant_productid', unique: false });
    // opcional
    await queryInterface.addIndex('products', ['merchant_id', 'ean'], { name: 'idx_prod_merchant_ean', unique: false });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('products', 'idx_prod_merchant_external');
    await queryInterface.removeIndex('products', 'idx_prod_merchant_productid');
    await queryInterface.removeIndex('products', 'idx_prod_merchant_ean');
  }
};