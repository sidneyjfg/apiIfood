'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'reserved_quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'quantity' // Opcional: coloca após o campo `quantity`
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('products', 'reserved_quantity');
  }
};
