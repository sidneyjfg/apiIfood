'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('auth_tokens', 'merchant_id', {
      type: Sequelize.STRING,
      allowNull: true, // torna NOT NULL na fase B
      after: 'id'
    });
    await queryInterface.addIndex('auth_tokens', ['merchant_id']);
    await queryInterface.addIndex('auth_tokens', ['provider']);
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('auth_tokens', ['merchant_id']);
    await queryInterface.removeIndex('auth_tokens', ['provider']);
    await queryInterface.removeColumn('auth_tokens', 'merchant_id');
  }
};