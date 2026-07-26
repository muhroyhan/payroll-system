import { test, expect } from '@playwright/test';
import { FixtureSet } from '../support/fixtures';
import { ADMIN_STORAGE_STATE, adminApi } from '../support/session';

// FE-T26/T27/T28 (09_FRONTEND_STEPS.md), §15.12 (08_FRONTEND_STRUCTURE.md).
// The single highest financial-risk surface in the app: draft → calculate →
// approve → disburse is a one-way trip once past `approved` (§11 — no
// revert path past that point), and the whole point of PayrollRunDetailPage
// is that the wrong button being visible at the wrong state would let an
// admin accidentally skip or repeat a stage. This walks the full state
// machine once forward, once via the revert branch, asserting exactly which
// action button exists (not just enabled/disabled — `Revert` and
// `Setujui`/`Cairkan` structurally disappear outside their valid state, per
// PayrollRunDetailPage.tsx's per-status conditional rendering).
test.use({ storageState: ADMIN_STORAGE_STATE });

const PERIOD = '2099-01';

test.describe('Payroll run state machine', () => {
  let fx: FixtureSet;
  let runId: string;

  test.beforeEach(async () => {
    const api = adminApi();
    fx = new FixtureSet(api);
    const org = await fx.createOrgScaffold();
    const employee = await fx.createEmployee(org);
    await fx.createSalaryMaster(employee.id, '8000000.00');
    const run = await fx.createPayrollRun(PERIOD);
    runId = run.id;
  });

  test.afterEach(async () => {
    await fx.cleanup();
  });

  test('draft -> calculated -> revert -> calculated -> approved -> disbursed, buttons match each state', async ({
    page,
  }) => {
    await page.goto(`/payroll-runs/${runId}`);
    await expect(page.getByRole('heading', { name: `Payroll Run — ${PERIOD}` })).toBeVisible();

    // --- draft ---
    await expect(page.getByRole('button', { name: 'Hitung' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Setujui' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cairkan' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Kembalikan ke Draft' })).toHaveCount(0);

    // --- draft -> calculated ---
    await page.getByRole('button', { name: 'Hitung' }).click();
    await expect(page.getByRole('button', { name: 'Setujui' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Hitung' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Kembalikan ke Draft' })).toBeVisible();

    // --- calculated -> revert -> draft ---
    await page.getByRole('button', { name: 'Kembalikan ke Draft' }).click();
    await page.getByRole('button', { name: 'Ya, kembalikan ke draft' }).click();
    await expect(page.getByRole('button', { name: 'Hitung' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Setujui' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Kembalikan ke Draft' })).toHaveCount(0);

    // --- draft -> calculated (again) ---
    await page.getByRole('button', { name: 'Hitung' }).click();
    await expect(page.getByRole('button', { name: 'Setujui' })).toBeVisible({ timeout: 30_000 });

    // --- calculated -> approved ---
    await page.getByRole('button', { name: 'Setujui' }).click();
    await expect(page.getByRole('button', { name: 'Cairkan' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Setujui' })).toHaveCount(0);
    // Revert must be structurally absent past `approved` — not merely
    // disabled — per §11 (an approved/disbursed run has no revert path).
    await expect(page.getByRole('button', { name: 'Kembalikan ke Draft' })).toHaveCount(0);

    // --- approved -> disbursed (terminal) ---
    await page.getByRole('button', { name: 'Cairkan' }).click();
    await expect(page.getByText('Dicairkan')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Cairkan' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Setujui' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hitung' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Kembalikan ke Draft' })).toHaveCount(0);
  });
});
