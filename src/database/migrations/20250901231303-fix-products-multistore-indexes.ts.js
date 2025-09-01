'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Leia os índices atuais
    const [rows] = await queryInterface.sequelize.query('SHOW INDEX FROM `products`');
    const hasIndex = (name) => rows.some((r) => r.Key_name === name);

    // Procura qualquer UNIQUE por coluna (nome pode variar)
    const findUniqueIndexByColumn = (col) =>
      rows.find((r) => r.Column_name === col && r.Non_unique === 0);

    // 1) Remover UNIQUE global de external_code (se existir)
    const extUnique = findUniqueIndexByColumn('external_code');
    if (extUnique) {
      await queryInterface.removeIndex('products', extUnique.Key_name);
    } else {
      // tentativas adicionais por compatibilidade
      try { await queryInterface.removeIndex('products', ['external_code']); } catch (e) {}
      try { await queryInterface.removeIndex('products', 'external_code'); } catch (e) {}
    }

    // 2) Remover UNIQUE global de product_id (se existir)
    const prodUnique = findUniqueIndexByColumn('product_id');
    if (prodUnique) {
      await queryInterface.removeIndex('products', prodUnique.Key_name);
    } else {
      try { await queryInterface.removeIndex('products', ['product_id']); } catch (e) {}
      try { await queryInterface.removeIndex('products', 'product_id'); } catch (e) {}
    }

    // 3) Criar UNIQUE compostos por merchant, se não existirem
    if (!hasIndex('uq_prod_merchant_external')) {
      await queryInterface.addIndex('products', ['merchant_id', 'external_code'], {
        name: 'uq_prod_merchant_external',
        unique: true,
      });
    }

    if (!hasIndex('uq_prod_merchant_productid')) {
      await queryInterface.addIndex('products', ['merchant_id', 'product_id'], {
        name: 'uq_prod_merchant_productid',
        unique: true,
      });
    }

    // 4) Índice auxiliar para busca por EAN por loja (não-único), se não existir
    if (!hasIndex('idx_prod_merchant_ean')) {
      await queryInterface.addIndex('products', ['merchant_id', 'ean'], {
        name: 'idx_prod_merchant_ean',
        unique: false,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query('SHOW INDEX FROM `products`');
    const hasIndex = (name) => rows.some((r) => r.Key_name === name);

    // Remover índices compostos se existirem
    if (hasIndex('uq_prod_merchant_external')) {
      await queryInterface.removeIndex('products', 'uq_prod_merchant_external');
    }
    if (hasIndex('uq_prod_merchant_productid')) {
      await queryInterface.removeIndex('products', 'uq_prod_merchant_productid');
    }
    if (hasIndex('idx_prod_merchant_ean')) {
      await queryInterface.removeIndex('products', 'idx_prod_merchant_ean');
    }

    // Recriar UNIQUE globais (reversão) se não existirem
    if (!hasIndex('external_code')) {
      await queryInterface.addIndex('products', ['external_code'], {
        name: 'external_code',
        unique: true,
      });
    }
    if (!hasIndex('product_id')) {
      await queryInterface.addIndex('products', ['product_id'], {
        name: 'product_id',
        unique: true,
      });
    }
  },
};
