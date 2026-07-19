'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ter_bracket_masters', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      ter_category: { type: Sequelize.ENUM('A', 'B', 'C'), allowNull: false },
      income_lower_bound: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      income_upper_bound: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      rate: { type: Sequelize.DECIMAL(6, 5), allowNull: false },
      effective_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      effective_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ter_bracket_masters');
  },
};
