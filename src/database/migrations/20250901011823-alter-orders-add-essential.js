'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('orders');

    const addIfMissing = async (name, spec) => {
      if (!table[name]) {
        await queryInterface.addColumn('orders', name, spec);
      }
    };

    // já usados/necessários (você tentou salvar e faltou no DB)
    await addIfMissing('customer_id',   { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('customer_name', { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('customer_phone',{ type: Sequelize.STRING,  allowNull: true });

    // novos campos p/ relatórios
    await addIfMissing('sales_channel', { type: Sequelize.STRING,  allowNull: true }); // ex.: 'IFOOD'
    await addIfMissing('preparation_start_datetime', { type: Sequelize.DATE, allowNull: true });

    // denormalização de endereço (city/UF)
    await addIfMissing('delivery_city', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('delivery_state',{ type: Sequelize.STRING, allowNull: true });

    // nº de pedidos do cliente na loja (para métrica de cliente novo/recorrente)
    await addIfMissing('customer_orders_on_merchant', { type: Sequelize.INTEGER, allowNull: true });

    // garantir que estes aceitam NULL (caso já existam como NOT NULL)
    if (table.delivery_datetime && table.delivery_datetime.allowNull === false) {
      await queryInterface.changeColumn('orders', 'delivery_datetime', { type: Sequelize.DATE, allowNull: true });
    }
    if (table.delivery_address && table.delivery_address.allowNull === false) {
      await queryInterface.changeColumn('orders', 'delivery_address', { type: Sequelize.JSON, allowNull: true });
    }
  },

  async down(queryInterface/*, Sequelize*/) {
    // Remova apenas se precisar (opcional)
    await queryInterface.removeColumn('orders', 'customer_orders_on_merchant').catch(()=>{});
    await queryInterface.removeColumn('orders', 'delivery_state').catch(()=>{});
    await queryInterface.removeColumn('orders', 'delivery_city').catch(()=>{});
    await queryInterface.removeColumn('orders', 'preparation_start_datetime').catch(()=>{});
    await queryInterface.removeColumn('orders', 'sales_channel').catch(()=>{});
    await queryInterface.removeColumn('orders', 'customer_phone').catch(()=>{});
    await queryInterface.removeColumn('orders', 'customer_name').catch(()=>{});
    await queryInterface.removeColumn('orders', 'customer_id').catch(()=>{});
  }
};
