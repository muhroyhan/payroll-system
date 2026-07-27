'use strict';

// 0008 — audit-trail follow-up (dispute-traceability review, §D, last item):
// attendance_records had a `source` column (manual/csv_import/fingerprint)
// but no actor at all — neither who manually entered/corrected a row nor who
// performed a cross-source overwrite (TC-ATT-07's `overwrite=true` path).
// `entered_by` is set whenever a row's CURRENT data was written via manual
// entry (source = manual) — null again the moment a different source
// overwrites it, since the manual actor no longer authored what's on the
// row. `overwritten_by` is set only on the specific write that replaced a
// differently-sourced row (the overwrite=true branch of
// AttendanceRecordsService.upsert) — null on a same-source update, since
// that isn't an overwrite. Both nullable, no FK constraint — same shape as
// every other actor column added by 0003-0006.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `attendance_records` ' +
        'ADD COLUMN `entered_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, ' +
        'ADD COLUMN `overwritten_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL;',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `attendance_records` ' +
        'DROP COLUMN `entered_by`, ' +
        'DROP COLUMN `overwritten_by`;',
    );
  },
};
