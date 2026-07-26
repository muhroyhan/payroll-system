'use strict';

// 0007 — generic append-only audit trail (dispute-traceability review,
// structural item): audit_events is a before/after value history layered on
// TOP OF the existing per-table actor columns (created_by/updated_by/
// approved_by/disbursed_by/reverted_by/reason, see 0003-0006) — it does not
// replace them. Phase 1 scope only: payroll_runs (every state transition),
// the 7 effective-dated masters, and employees.ptkp_manually_overridden.
// Written exclusively by a Sequelize afterCreate/afterUpdate/afterDestroy
// hook (see apps/api/src/common/audit) — there is deliberately no
// update/delete endpoint for this table, not even for admins (append-only).
// `actor_role` is a plain varchar (not an ENUM tied to the Role type) so a
// system-triggered transition (e.g. the draft -> calculated flip done by the
// background calculation job, with no human actor) can record 'system'
// without a schema change every time a new role is added.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE TABLE `audit_events` (' +
        '`id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, ' +
        '`entity_type` varchar(255) NOT NULL, ' +
        '`entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, ' +
        "`action` enum('create','update','delete') NOT NULL, " +
        '`actor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL, ' +
        '`actor_role` varchar(255) DEFAULT NULL, ' +
        '`changed_fields` json NOT NULL, ' +
        '`reason` text DEFAULT NULL, ' +
        '`created_at` datetime NOT NULL, ' +
        'PRIMARY KEY (`id`), ' +
        'KEY `audit_events_entity_idx` (`entity_type`,`entity_id`,`created_at`)' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP TABLE IF EXISTS `audit_events`;',
    );
  },
};
