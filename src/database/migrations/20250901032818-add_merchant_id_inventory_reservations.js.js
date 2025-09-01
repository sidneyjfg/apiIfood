'use strict';

async function indexExists(qi, table, indexName) {
  const [rows] = await qi.sequelize.query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :table
        AND INDEX_NAME = :idx
      LIMIT 1`,
    { replacements: { table, idx: indexName } }
  );
  return rows.length > 0;
}

async function colMaxLen(qi, table, col) {
  const [[row]] = await qi.sequelize.query(
    `SELECT COALESCE(MAX(CHAR_LENGTH(\`${col}\`)),0) AS m FROM \`${table}\``
  );
  return Number(row.m || 0);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const table = 'inventory_reservations';

    // 1) merchant_id (add se faltar)
    const desc = await qi.describeTable(table);
    if (!desc.merchant_id) {
      await qi.addColumn(table, 'merchant_id', {
        type: Sequelize.STRING(45),
        allowNull: true,
        after: 'id' // opcional
      });
    }

    // 2) Ajuste de tamanhos para caber no índice composto
    //    alvo: merchant_id=45, order_id/item_key até 128, state=20, product_id=45 (se usar no outro índice)
    const maxOrder   = await colMaxLen(qi, table, 'order_id');
    const maxItemKey = await colMaxLen(qi, table, 'item_key');
    const maxState   = await colMaxLen(qi, table, 'state');
    const maxProdId  = await colMaxLen(qi, table, 'product_id');

    // não reduza abaixo do que já existe; cape em 128 (ids) e 20 (state)
    const lenOrder   = Math.min(Math.max(45, maxOrder),   128);
    const lenItemKey = Math.min(Math.max(45, maxItemKey), 128);
    const lenState   = Math.min(Math.max(20, maxState),   20);   // mantém 20
    const lenProdId  = Math.min(Math.max(45, maxProdId),  128);  // por segurança

    // changeColumn é idempotente (ajusta tipagem/tamanho)
    await qi.changeColumn(table, 'order_id', {   type: Sequelize.STRING(lenOrder),   allowNull: true  });
    await qi.changeColumn(table, 'item_key', {   type: Sequelize.STRING(lenItemKey), allowNull: true  });
    await qi.changeColumn(table, 'state',    {   type: Sequelize.STRING(lenState),   allowNull: false });
    await qi.changeColumn(table, 'product_id',{  type: Sequelize.STRING(lenProdId),  allowNull: false });

    // 3) Índices
    if (!(await indexExists(qi, table, 'idx_res_merchant_product'))) {
      await qi.addIndex(table, ['merchant_id', 'product_id'], {
        name: 'idx_res_merchant_product',
        using: 'BTREE'
      });
    }

    if (!(await indexExists(qi, table, 'idx_res_merchant_order_item_state'))) {
      await qi.addIndex(
        table,
        ['merchant_id', 'order_id', 'item_key', 'state'],
        { name: 'idx_res_merchant_order_item_state', using: 'BTREE' }
      );
    }
  },

  async down(queryInterface) {
    const qi = queryInterface;
    const table = 'inventory_reservations';

    try { await qi.removeIndex(table, 'idx_res_merchant_product'); } catch {}
    try { await qi.removeIndex(table, 'idx_res_merchant_order_item_state'); } catch {}

    const desc = await qi.describeTable(table);
    if (desc.merchant_id) {
      await qi.removeColumn(table, 'merchant_id');
    }

    // (Opcional) reverter tamanhos aqui, se necessário
  }
};
