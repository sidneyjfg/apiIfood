'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('user_api_ifood', [
      {
        client_id: '7d627e14-94ee-4bb9-acaf-fe1bb7dde65a',
        client_secret:
          'rnmp09vsnwm8pdoj9xb2qrgednvvhjbyw4hgyhough4h1o3lsc9faj5hnn704gc1v4la7ri37na6j8oynjdit5jmchnoms1f67g',
        access_token: null,
        refresh_token: null,
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('user_api_ifood', {
      client_id: '7d627e14-94ee-4bb9-acaf-fe1bb7dde65a',
    });
  },
};
