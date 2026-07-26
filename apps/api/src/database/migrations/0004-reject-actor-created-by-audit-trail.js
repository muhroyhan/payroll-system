'use strict';

// 0004 — audit-trail follow-up (dispute-traceability review, §1A):
// leave_requests / kasbon / surat_ijin / overtime_letters could already record
// WHO approved (approved_by) or verified (verified_by) a request, but had zero
// trace of who rejected one, who filed it in the first place, or why it was
// rejected. Same nullable "written together, never one without the other"
// shape as 0003's revert_reason/reverted_by: not every row has been rejected,
// but the service layer enforces reject() always sets both rejected_by and
// reject_reason, never one without the other. created_by is set going forward
// only — existing rows keep it null rather than guessing an actor.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `leave_requests` ' +
        'ADD COLUMN `rejected_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, ' +
        'ADD COLUMN `reject_reason` text DEFAULT NULL, ' +
        'ADD COLUMN `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL;',
    );

    await queryInterface.sequelize.query(
      'ALTER TABLE `kasbon` ' +
        'ADD COLUMN `rejected_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, ' +
        'ADD COLUMN `reject_reason` text DEFAULT NULL, ' +
        'ADD COLUMN `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL;',
    );

    await queryInterface.sequelize.query(
      'ALTER TABLE `surat_ijin` ' +
        'ADD COLUMN `rejected_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, ' +
        'ADD COLUMN `reject_reason` text DEFAULT NULL, ' +
        'ADD COLUMN `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL;',
    );

    await queryInterface.sequelize.query(
      'ALTER TABLE `overtime_letters` ' +
        'ADD COLUMN `rejected_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, ' +
        'ADD COLUMN `reject_reason` text DEFAULT NULL, ' +
        'ADD COLUMN `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL;',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `overtime_letters` ' +
        'DROP COLUMN `rejected_by`, ' +
        'DROP COLUMN `reject_reason`, ' +
        'DROP COLUMN `created_by`;',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `surat_ijin` ' +
        'DROP COLUMN `rejected_by`, ' +
        'DROP COLUMN `reject_reason`, ' +
        'DROP COLUMN `created_by`;',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `kasbon` ' +
        'DROP COLUMN `rejected_by`, ' +
        'DROP COLUMN `reject_reason`, ' +
        'DROP COLUMN `created_by`;',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `leave_requests` ' +
        'DROP COLUMN `rejected_by`, ' +
        'DROP COLUMN `reject_reason`, ' +
        'DROP COLUMN `created_by`;',
    );
  },
};
