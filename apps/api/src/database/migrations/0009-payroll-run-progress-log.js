'use strict';

// 0009 — BUGS#15: the calculation progress bar (P8-T02's processed_count/
// total_count) only ever showed a percentage, never WHAT the job was doing.
// Investigated first (per the task instruction) whether the BullMQ worker
// already emitted step-level events anywhere — it didn't: no
// job.updateProgress/job.log calls, no WebSocket/event-emitter infra
// anywhere in the codebase, just the two numeric counters written via
// run.update(). `progress_log` is a JSON array of {message, at} entries the
// processor appends to at each meaningful checkpoint (start, each chunk,
// completion) — capped client-side-visible via MAX_PROGRESS_LOG_ENTRIES in
// the processor, so the column never grows unbounded. Read through the same
// existing poll (usePayrollRunQuery's refetchInterval) rather than adding a
// new WebSocket channel — this app has no realtime transport at all yet,
// and a payroll run's chunked job finishes in seconds to low minutes, so a
// second poll target is proportionate where a persistent socket would not
// be.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE `payroll_runs` ADD COLUMN `progress_log` JSON DEFAULT NULL;",
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `payroll_runs` DROP COLUMN `progress_log`;',
    );
  },
};
