'use strict';

// 0005 — audit-trail follow-up (dispute-traceability review, §1C):
// the 7 effective-dated masters (salary_masters, incentive_masters,
// ptkp_masters, ter_bracket_masters, bpjs_kesehatan_masters,
// bpjs_ketenagakerjaan_masters, leave_policy_masters) recorded who CREATED a
// row (created_by) but nothing about who last touched it (update() had no
// actor at all) or why/by-whom a row was retired (effectiveEndDate set,
// manually or automatically via closeOverlappingPredecessor). updated_by is
// set on every update() from here on; reason + supersedes_id are set
// specifically at retire time (manual retire requires reason at the service
// layer; automatic retire via closeOverlappingPredecessor fills both with a
// generated reason and the id of the row that superseded it). All three
// columns are plain nullable actor/text columns, no FK constraint — same
// shape as the existing approved_by/verified_by/created_by columns on this
// and other tables, none of which are FK-enforced either.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = [
      'salary_masters',
      'incentive_masters',
      'ptkp_masters',
      'ter_bracket_masters',
      'bpjs_kesehatan_masters',
      'bpjs_ketenagakerjaan_masters',
      'leave_policy_masters',
    ];
    for (const table of tables) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` ` +
          'ADD COLUMN `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, ' +
          'ADD COLUMN `reason` text DEFAULT NULL, ' +
          'ADD COLUMN `supersedes_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL;',
      );
    }
  },

  async down(queryInterface) {
    const tables = [
      'leave_policy_masters',
      'bpjs_ketenagakerjaan_masters',
      'bpjs_kesehatan_masters',
      'ter_bracket_masters',
      'ptkp_masters',
      'incentive_masters',
      'salary_masters',
    ];
    for (const table of tables) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` ` +
          'DROP COLUMN `updated_by`, ' +
          'DROP COLUMN `reason`, ' +
          'DROP COLUMN `supersedes_id`;',
      );
    }
  },
};
