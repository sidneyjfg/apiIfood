'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('orders');

    const addIfMissing = async (name, spec) => {
      if (!table[name]) {
        await queryInterface.addColumn('orders', name, spec);
      }
    };

    // 💰 Campos financeiros essenciais (idempotente)
    await addIfMissing('subtotal', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    });

    await addIfMissing('delivery_fee', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    });

    await addIfMissing('additional_fees', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true
    });

    await addIfMissing('order_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    });

    await addIfMissing('prepaid_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true
    });

    await addIfMissing('pending_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true
    });

    // 🔧 Se já existirem mas com tipo diferente/NOT NULL onde não deveria,
    // você pode normalizar aqui (opcional):
    const normalizeMoney = async (name, allowNull, defVal) => {
      if (table[name]) {
        await queryInterface.changeColumn('orders', name, {
          type: Sequelize.DECIMAL(12, 2),
          allowNull,
          ...(defVal !== undefined ? { defaultValue: defVal } : {})
        });
      }
    };

    await normalizeMoney('subtotal', false, 0);
    await normalizeMoney('delivery_fee', false, 0);
    await normalizeMoney('additional_fees', true);
    await normalizeMoney('order_amount', false, 0);
    await normalizeMoney('prepaid_amount', true);
    await normalizeMoney('pending_amount', true);
  },

  async down(queryInterface/*, Sequelize*/) {
    // Geralmente não removemos campos financeiros em produção,
    // mas deixo aqui caso precise reverter em ambiente de dev:
    await queryInterface.removeColumn('orders', 'pending_amount').catch(()=>{});
    await queryInterface.removeColumn('orders', 'prepaid_amount').catch(()=>{});
    await queryInterface.removeColumn('orders', 'order_amount').catch(()=>{});
    await queryInterface.removeColumn('orders', 'additional_fees').catch(()=>{});
    await queryInterface.removeColumn('orders', 'delivery_fee').catch(()=>{});
    await queryInterface.removeColumn('orders', 'subtotal').catch(()=>{});
  }
};
