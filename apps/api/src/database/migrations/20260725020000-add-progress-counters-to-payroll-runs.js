'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // P8-T02 — progress counters for the chunked calculation job (§01_GENERAL:
    // "Store processed_count / total_count on payroll_runs" for the progress
    // bar). Deferred from P8-T01, which kept the entity to §5.8's exact schema.
    await queryInterface.addColumn('payroll_runs', 'processed_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('payroll_runs', 'total_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payroll_runs', 'total_count');
    await queryInterface.removeColumn('payroll_runs', 'processed_count');
  },
};
