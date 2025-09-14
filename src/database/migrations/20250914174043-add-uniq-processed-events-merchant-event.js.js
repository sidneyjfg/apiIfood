// migrations/20250914T174043-fix-uniq-processed-events-merchant-event.js
'use strict';

const INDEX_SIMPLE = 'idx_processed_events_merchant';
const INDEX_UNIQ   = 'uniq_processed_events_merchant_event';

async function indexExists(queryInterface, table, indexName) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :table
      AND INDEX_NAME = :indexName
    LIMIT 1
  `, { replacements: { table, indexName }});
  return rows && rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // idx simples em merchant_id (ignorar se já existir)
    if (!(await indexExists(queryInterface, 'processed_events', INDEX_SIMPLE))) {
      await queryInterface.addIndex('processed_events', ['merchant_id'], { name: INDEX_SIMPLE }).catch(()=>{});
    }

    // índice único composto (ignorar se já existir)
    if (!(await indexExists(queryInterface, 'processed_events', INDEX_UNIQ))) {
      await queryInterface.addIndex('processed_events', ['merchant_id', 'event_id'], {
        unique: true,
        name: INDEX_UNIQ,
      }).catch(()=>{});
    }
  },

  async down(queryInterface, Sequelize) {
    // remove apenas se existir
    if (await indexExists(queryInterface, 'processed_events', INDEX_UNIQ)) {
      await queryInterface.removeIndex('processed_events', INDEX_UNIQ).catch(()=>{});
    }
    // o simples é opcional remover
    if (await indexExists(queryInterface, 'processed_events', INDEX_SIMPLE)) {
      await queryInterface.removeIndex('processed_events', INDEX_SIMPLE).catch(()=>{});
    }
  }
};
