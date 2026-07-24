'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // §7 / R7 — biaya jabatan (occupational-cost deduction) for the December
    // annual PPh21 true-up. Effective-dated like every other tax constant so
    // a period's payslip uses the rate/cap that was active for that period.
    // Not used by the monthly TER path (P7-T02/T03) — added now so P7-T04 has
    // it ready. Consumed only in the annual recompute.
    await queryInterface.createTable('biaya_jabatan_masters', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      rate: { type: Sequelize.DECIMAL(6, 5), allowNull: false },
      monthly_cap: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      annual_cap: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      effective_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      effective_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('biaya_jabatan_masters');
  },
};
