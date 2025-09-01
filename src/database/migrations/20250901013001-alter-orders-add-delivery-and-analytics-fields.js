'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('orders');

    const addIfMissing = async (name, spec) => {
      if (!table[name]) {
        await queryInterface.addColumn('orders', name, spec);
      }
    };

    // Cliente (algumas podem já existir — adiciona só se faltar)
    await addIfMissing('customer_id',                { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('customer_name',              { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('customer_document',          { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('customer_phone',             { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('customer_orders_on_merchant',{ type: Sequelize.INTEGER, allowNull: true });

    // Pedido / canal
    await addIfMissing('sales_channel',              { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('order_timing',               { type: Sequelize.STRING,  allowNull: true }); // caso falte em prod

    // Preparação / Entrega
    await addIfMissing('preparation_start_datetime', { type: Sequelize.DATE,    allowNull: true });
    await addIfMissing('delivery_mode',              { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('delivery_description',       { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('delivered_by',               { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('delivery_datetime',          { type: Sequelize.DATE,    allowNull: true });

    // ⚠️ Campo que está faltando no seu erro:
    await addIfMissing('delivery_address',           { type: Sequelize.JSON,    allowNull: true });

    await addIfMissing('delivery_observations',      { type: Sequelize.TEXT,    allowNull: true });
    await addIfMissing('delivery_city',              { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('delivery_state',             { type: Sequelize.STRING,  allowNull: true });
    await addIfMissing('pickup_code',                { type: Sequelize.STRING,  allowNull: true });

    // Financeiro (caso falte em prod)
    await addIfMissing('prepaid_amount',             { type: Sequelize.FLOAT,   allowNull: true });
    await addIfMissing('pending_amount',             { type: Sequelize.FLOAT,   allowNull: true });

    // Ajustes de nullability (se já existem porém NOT NULL)
    if (table.delivery_datetime && table.delivery_datetime.allowNull === false) {
      await queryInterface.changeColumn('orders', 'delivery_datetime', { type: Sequelize.DATE, allowNull: true });
    }
    if (table.delivery_address && table.delivery_address.allowNull === false) {
      await queryInterface.changeColumn('orders', 'delivery_address', { type: Sequelize.JSON, allowNull: true });
    }
  },

  async down(queryInterface/*, Sequelize */) {
    // Reversões opcionais; normalmente não removemos em produção.
    await queryInterface.removeColumn('orders', 'delivery_address').catch(()=>{});
    await queryInterface.removeColumn('orders', 'delivery_city').catch(()=>{});
    await queryInterface.removeColumn('orders', 'delivery_state').catch(()=>{});
    await queryInterface.removeColumn('orders', 'delivery_observations').catch(()=>{});
    await queryInterface.removeColumn('orders', 'delivery_datetime').catch(()=>{});
    await queryInterface.removeColumn('orders', 'delivered_by').catch(()=>{});
    await queryInterface.removeColumn('orders', 'delivery_description').catch(()=>{});
    await queryInterface.removeColumn('orders', 'delivery_mode').catch(()=>{});
    await queryInterface.removeColumn('orders', 'preparation_start_datetime').catch(()=>{});
    await queryInterface.removeColumn('orders', 'sales_channel').catch(()=>{});
    await queryInterface.removeColumn('orders', 'customer_orders_on_merchant').catch(()=>{});
    await queryInterface.removeColumn('orders', 'customer_phone').catch(()=>{});
    await queryInterface.removeColumn('orders', 'customer_document').catch(()=>{});
    await queryInterface.removeColumn('orders', 'customer_name').catch(()=>{});
    await queryInterface.removeColumn('orders', 'customer_id').catch(()=>{});
    await queryInterface.removeColumn('orders', 'pickup_code').catch(()=>{});
    await queryInterface.removeColumn('orders', 'prepaid_amount').catch(()=>{});
    await queryInterface.removeColumn('orders', 'pending_amount').catch(()=>{});
  }
};
