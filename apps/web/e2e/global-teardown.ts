import { closePool, count, exec, queryRows } from './support/db';
import { deleteFixturesByIds } from './support/fixtures';
import { E2E_PERIOD_PREFIX, FIXTURE_TAG } from './support/env';

/**
 * Safety net, not the primary cleanup mechanism — every spec's own
 * afterEach already deletes exactly what it created (support/fixtures.ts's
 * FixtureSet.cleanup()). This only matters when a test process dies mid-test
 * (crash, forced kill, `--reporter` abort) before that afterEach gets a
 * chance to run, per the task's explicit requirement.
 *
 * Finds anything still tagged as this suite's own fixture data — employees/
 * org masters named with FIXTURE_TAG, payroll runs in the reserved
 * E2E_PERIOD_PREFIX range — and sweeps it with the same cascade-delete used
 * by per-test cleanup. Then re-counts and fails loudly (non-zero exit) if
 * anything survived the sweep, since that would mean a table this suite
 * touches isn't covered by deleteFixturesByIds yet — a real gap to fix, not
 * something to silently ignore.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    const employees = await queryRows<{ id: string }>(
      'SELECT id FROM employees WHERE name LIKE ?',
      [`${FIXTURE_TAG}%`],
    );
    const runs = await queryRows<{ id: string }>(
      'SELECT id FROM payroll_runs WHERE period LIKE ?',
      [`${E2E_PERIOD_PREFIX}%`],
    );
    const employeeIds = employees.map((e) => e.id);
    const runIds = runs.map((r) => r.id);
    const orgTables = ['divisions', 'departments', 'positions', 'employee_types'] as const;
    const orphanOrgCounts = await Promise.all(
      orgTables.map((table) => count(`SELECT COUNT(*) AS n FROM ${table} WHERE name LIKE ?`, [`${FIXTURE_TAG}%`])),
    );
    const hasOrphanOrgRows = orphanOrgCounts.some((n) => n > 0);

    if (employeeIds.length === 0 && runIds.length === 0 && !hasOrphanOrgRows) {
      console.log('[e2e] global-teardown: no leftover fixture rows found — DB already clean.');
      return;
    }

    console.warn(
      `[e2e] global-teardown: sweeping ${employeeIds.length} leftover employee(s), ` +
        `${runIds.length} leftover payroll run(s), and any orphaned org master(s) — these ` +
        `should have been removed by an individual test's afterEach; their survival means a ` +
        `test crashed mid-run.`,
    );

    // Org masters swept unconditionally (not gated on employeeIds/runIds
    // being non-empty) — a crash between creating an org scaffold and
    // creating its employee would otherwise leave an orphan this sweep
    // never looks for.
    await deleteFixturesByIds(employeeIds, runIds);
    for (const table of orgTables) {
      await exec(`DELETE FROM ${table} WHERE name LIKE ?`, [`${FIXTURE_TAG}%`]);
    }

    // Verify: re-count everything this sweep just tried to remove. Any
    // survivor here is a real bug in deleteFixturesByIds's coverage, not an
    // expected outcome — surfaced as a thrown error so it fails the run
    // instead of being swallowed.
    const remainingEmployees = await count('SELECT COUNT(*) AS n FROM employees WHERE name LIKE ?', [
      `${FIXTURE_TAG}%`,
    ]);
    const remainingRuns = await count('SELECT COUNT(*) AS n FROM payroll_runs WHERE period LIKE ?', [
      `${E2E_PERIOD_PREFIX}%`,
    ]);
    const remainingOrgCounts = await Promise.all(
      orgTables.map((table) => count(`SELECT COUNT(*) AS n FROM ${table} WHERE name LIKE ?`, [`${FIXTURE_TAG}%`])),
    );
    const remainingOrgRows = remainingOrgCounts.reduce((a, b) => a + b, 0);
    if (remainingEmployees > 0 || remainingRuns > 0 || remainingOrgRows > 0) {
      throw new Error(
        `[e2e] global-teardown: DB NOT clean after sweep — ${remainingEmployees} employee(s), ` +
          `${remainingRuns} payroll run(s), ${remainingOrgRows} org master row(s) still remain. ` +
          `deleteFixturesByIds is missing a table.`,
      );
    }
    console.log('[e2e] global-teardown: sweep complete, DB verified clean.');
  } finally {
    await closePool();
  }
}
