'use strict';

module.exports = {
  async up(queryInterface/*, Sequelize */) {
    const t = await queryInterface.describeTable('products');
    if (t.reserved_quantity) {
      await queryInterface.removeColumn('products', 'reserved_quantity');
    }
  },
  async down(queryInterface, Sequelize) {
    // se precisar reverter (dev)
    await queryInterface.addColumn('products', 'reserved_quantity', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });
  }
};
