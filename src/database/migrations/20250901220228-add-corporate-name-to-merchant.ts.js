// migration opcional para adicionar corporate_name
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('merchants', 'corporate_name', {
      type: Sequelize.STRING(160),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('merchants', 'corporate_name');
  },
};
