'use strict';

// 0003 — audit-trail follow-up (dispute-traceability review, §1B/§D/HIGH):
// three destructive-or-sensitive actions had no recorded actor at all:
//   • payroll_runs.revert (calculated -> draft) tears down payslips/kasbon
//     deductions with zero trace of who ordered it or why.
//   • payroll_runs.disburse (approved -> disbursed) is the actual
//     money-out step, previously only recorded `locked_at`, no actor.
//   • employees.ptkp_manually_overridden flipping false -> true changes
//     PPh21 withholding with zero trace of who authorized it or why.
// `reverted_by`/`revert_reason` and `ptkp_overridden_by`/`ptkp_overridden_reason`
// are nullable — not every run has been reverted, not every employee has an
// override — but the service layer enforces they're always written together
// (actor + reason, never one without the other) whenever the action actually
// happens.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `payroll_runs` ' +
        'ADD COLUMN `reverted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, ' +
        'ADD COLUMN `revert_reason` text DEFAULT NULL, ' +
        'ADD COLUMN `disbursed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL;',
    );

    await queryInterface.sequelize.query(
      'ALTER TABLE `employees` ' +
        'ADD COLUMN `ptkp_overridden_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, ' +
        'ADD COLUMN `ptkp_overridden_at` datetime DEFAULT NULL, ' +
        'ADD COLUMN `ptkp_overridden_reason` text DEFAULT NULL;',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `employees` ' +
        'DROP COLUMN `ptkp_overridden_by`, ' +
        'DROP COLUMN `ptkp_overridden_at`, ' +
        'DROP COLUMN `ptkp_overridden_reason`;',
    );

    await queryInterface.sequelize.query(
      'ALTER TABLE `payroll_runs` ' +
        'DROP COLUMN `reverted_by`, ' +
        'DROP COLUMN `revert_reason`, ' +
        'DROP COLUMN `disbursed_by`;',
    );
  },
};
