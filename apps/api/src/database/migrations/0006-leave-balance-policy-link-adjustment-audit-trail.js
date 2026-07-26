'use strict';

// 0006 — audit-trail follow-up (dispute-traceability review, §1C):
// two gaps on leave_balances:
//  1. HR's direct quota edit (updateQuota) recorded manually_adjusted=true but
//     no actor and no reason — adjusted_by/adjustment_reason close that, same
//     "written together" shape as every other actor+reason pair added in
//     this audit trail.
//  2. leave_policy_master had no way to tell whether a given row had ever
//     been resolved into a real balance (no FK back from leave_balances),
//     which blocked adding the same assertLockedFieldsUntouched guard the
//     other 6 masters already have. resolved_from_policy_id closes that: set
//     whenever resolveOne() (single-employee or bulk year-start seeding)
//     actually resolves and creates a new balance row — left null for rows
//     that predate this column, exactly like every other backfill-less
//     column in this audit trail.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `leave_balances` ' +
        'ADD COLUMN `adjusted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, ' +
        'ADD COLUMN `adjustment_reason` text DEFAULT NULL, ' +
        'ADD COLUMN `resolved_from_policy_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL;',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `leave_balances` ' +
        'DROP COLUMN `adjusted_by`, ' +
        'DROP COLUMN `adjustment_reason`, ' +
        'DROP COLUMN `resolved_from_policy_id`;',
    );
  },
};
