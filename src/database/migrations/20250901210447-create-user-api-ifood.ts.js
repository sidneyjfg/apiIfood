'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_api_ifood', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      client_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },

      client_secret: {
        type: Sequelize.STRING(256),
        allowNull: false,
      },

      access_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('user_api_ifood', ['client_id'], {
      unique: true,
      name: 'uq_user_api_ifood_client_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('user_api_ifood', 'uq_user_api_ifood_client_id');
    await queryInterface.dropTable('user_api_ifood');
  },
};
