'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // §7 / R7 — progressive Pasal 17 brackets (UU HPP) for the December annual
    // PPh21 true-up. Same effective-dated, inclusive-bounds shape as
    // ter_bracket_masters (income_upper_bound null = open-ended top bracket).
    // Not used by the monthly TER path (P7-T02/T03) — added now so P7-T04 has
    // it ready.
    await queryInterface.createTable('pasal17_bracket_masters', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
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
    await queryInterface.dropTable('pasal17_bracket_masters');
  },
};
