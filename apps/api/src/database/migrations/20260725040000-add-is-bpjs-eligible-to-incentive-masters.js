'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // §9 Step 2 / P8-T04b — BPJS eligibility per incentive, data-driven (same
    // pattern as payslip_component_master.is_bpjs_eligible, P7-T06b). Rule:
    // fixed/recurring allowance → true, variable/one-off incentive → false.
    // The table was EMPTY at migration time, so there is nothing to backfill;
    // the DEFAULT false is the conservative starting value (an incentive not in
    // the BPJS base under-claims rather than over-deducts). New rows set it via
    // the DTO.
    await queryInterface.addColumn('incentive_masters', 'is_bpjs_eligible', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('incentive_masters', 'is_bpjs_eligible');
  },
};
