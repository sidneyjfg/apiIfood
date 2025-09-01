'use strict';

module.exports = {
  async up(qi, Sequelize) {
    const desc = await qi.describeTable('orders');

    // 1) Campos de status e trilha de evento
    if (!desc.status) {
      await qi.addColumn('orders', 'status', {
        type: Sequelize.STRING(32),
        allowNull: true,
        after: 'sales_channel',
      });
    }
    if (!desc.last_event_code) {
      await qi.addColumn('orders', 'last_event_code', {
        type: Sequelize.STRING(16),
        allowNull: true,
        after: 'status',
      });
    }
    if (!desc.last_event_at) {
      await qi.addColumn('orders', 'last_event_at', {
        type: Sequelize.DATE,
        allowNull: true,
        after: 'last_event_code',
      });
    }

    // 2) Índice (merchant_id, status)
    try {
      await qi.addIndex('orders', ['merchant_id', 'status'], {
        name: 'idx_orders_merchant_status',
      });
    } catch (e) {
      // índice já existe
    }

    // 3) Coluna REAL order_id (não-gerada)
    const hasOrderId = !!desc.order_id;
    if (!hasOrderId) {
      // criar coluna normal
      await qi.addColumn('orders', 'order_id', {
        type: Sequelize.STRING(45),
        allowNull: true,
        after: 'id',
      });
    } else {
      // Se existir e for GERADA (de migração anterior), converte para coluna normal
      try {
        const [rows] = await qi.sequelize.query(`
          SELECT EXTRA
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'orders'
            AND COLUMN_NAME = 'order_id'
        `);
        const extra = rows?.[0]?.EXTRA?.toUpperCase?.() || '';
        if (extra.includes('GENERATED')) {
          await qi.sequelize.query(`
            ALTER TABLE \`orders\`
            MODIFY COLUMN \`order_id\` VARCHAR(45) NULL
          `);
        }
      } catch (e) {
        // se der erro, seguimos adiante (pode já ser coluna normal)
      }
    }

    // 3b) Backfill: order_id = id
    await qi.sequelize.query(`
      UPDATE \`orders\`
      SET \`order_id\` = \`id\`
      WHERE \`order_id\` IS NULL
    `);

    // 4) Índice para order_id
    try {
      await qi.addIndex('orders', ['order_id'], {
        name: 'idx_orders_order_id',
      });
    } catch (e) {
      // índice já existe
    }
  },

  async down(qi/*, Sequelize */) {
    // Remover índices
    try { await qi.removeIndex('orders', 'idx_orders_order_id'); } catch {}
    try { await qi.removeIndex('orders', 'idx_orders_merchant_status'); } catch {}

    // Remover colunas (se existirem)
    const desc = await qi.describeTable('orders');
    if (desc.order_id)        { await qi.removeColumn('orders', 'order_id'); }
    if (desc.last_event_at)   { await qi.removeColumn('orders', 'last_event_at'); }
    if (desc.last_event_code) { await qi.removeColumn('orders', 'last_event_code'); }
    if (desc.status)          { await qi.removeColumn('orders', 'status'); }
  }
};
