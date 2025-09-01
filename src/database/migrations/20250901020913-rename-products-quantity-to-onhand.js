'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('products');

    // Se já existe on_hand, nada a fazer; se existe quantity e não on_hand, renomeia.
    if (!t.on_hand && t.quantity) {
      await queryInterface.renameColumn('products', 'quantity', 'on_hand');
    } else if (!t.on_hand && !t.quantity) {
      // fallback: cria on_hand caso nenhum exista (ambientes divergentes)
      await queryInterface.addColumn('products', 'on_hand', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }

    // Garante o tipo / nullability de on_hand
    const tt = await queryInterface.describeTable('products');
    if (tt.on_hand) {
      await queryInterface.changeColumn('products', 'on_hand', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }

    // reserved_quantity já foi removido, mas se existir por acaso, remove
    if (t.reserved_quantity) {
      await queryInterface.removeColumn('products', 'reserved_quantity').catch(()=>{});
    }
  },

  async down(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable('products');

    // Reverte o rename se possível
    if (!t.quantity && t.on_hand) {
      await queryInterface.renameColumn('products', 'on_hand', 'quantity').catch(()=>{});
    } else if (!t.quantity) {
      await queryInterface.addColumn('products', 'quantity', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }

    // (Opcional) recria reserved_quantity em dev
    if (!t.reserved_quantity) {
      await queryInterface.addColumn('products', 'reserved_quantity', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      }).catch(()=>{});
    }
  }
};
