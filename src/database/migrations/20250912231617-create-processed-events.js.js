'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('processed_events', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      merchant_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      event_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      event_type: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      payload_hash: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addConstraint('processed_events', {
      type: 'unique',
      fields: ['merchant_id', 'event_id'],
      name: 'uniq_processed_events_merchant_event',
    });

    await queryInterface.addIndex('processed_events', ['merchant_id', 'created_at'], {
      name: 'idx_processed_events_merchant_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('processed_events');
  },
};
