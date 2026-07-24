'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payslip_components', 'is_bpjs_eligible', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Backfill — classified per §9 Step 2 ("BPJS-Eligible Earnings... usually
    // base salary + fixed allowances, excluding one-off/incidental
    // components"), as DATA here, not as component-kind if/else logic in
    // application code (§3).
    //
    // 'Tunjangan Transport' (earning, is_taxable=true): a recurring monthly
    // fixed allowance (tunjangan tetap per its own name) — matches §9's
    // "fixed allowances" example directly. -> true
    //
    // 'Potongan Kasbon' (deduction, is_taxable=false): a deduction, not an
    // earning — BPJS-eligible wage-base membership is a concept that only
    // applies to earning components in this schema; the column default
    // (false) is correct here since a deduction never contributes to an
    // earnings base regardless of this flag's value. Not ambiguous — the
    // concept just doesn't apply, so no explicit UPDATE is needed, but one
    // is included below for an unambiguous, auditable trail rather than
    // relying silently on the column default.
    await queryInterface.sequelize.query(
      `UPDATE payslip_components SET is_bpjs_eligible = true WHERE name = 'Tunjangan Transport'`,
    );
    await queryInterface.sequelize.query(
      `UPDATE payslip_components SET is_bpjs_eligible = false WHERE name = 'Potongan Kasbon'`,
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('payslip_components', 'is_bpjs_eligible');
  },
};
