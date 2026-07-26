import { test, expect } from '@playwright/test';
import { FixtureSet } from '../support/fixtures';
import { ADMIN_STORAGE_STATE, adminApi } from '../support/session';
import { formFieldInput, setMonthPicker } from '../support/antdHelpers';

// §11 (05_BOUNDARIES_AND_TESTS.md) lock audit, mirroring FE-T33's own
// walkthrough: one test per lock family named in the task brief —
// attendance's period-lock banner, kasbon's post-deduction field freeze, and
// the two letters patterns (surat_ijin's fully client-derivable R-06a lock
// vs. surat_peringatan's R-06b fallback, which must stay unconditionally
// enabled since its lock genuinely isn't derivable client-side, §13.5 B-06).
test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('§11 lock system', () => {
  test('attendance period-lock banner appears once a run for that period passes draft', async ({
    page,
  }) => {
    const PERIOD = '2099-02';
    const api = adminApi();
    const fx = new FixtureSet(api);
    try {
      const org = await fx.createOrgScaffold();
      const employee = await fx.createEmployee(org);
      await fx.createSalaryMaster(employee.id, '8000000.00');
      await fx.createAttendanceRecord(employee.id, `${PERIOD}-10`);
      const run = await fx.createPayrollRun(PERIOD);
      await fx.calculateAndWait(run.id);

      await page.goto('/attendance/records');
      await setMonthPicker(page, PERIOD);

      // The Alert's message AND description both start with this phrase
      // (AttendanceRecordsPage.tsx repeats the period in both) — exact:true
      // matches only the message element (whose full text equals exactly
      // this string), not the longer description that merely starts with it.
      await expect(page.getByText(`Periode ${PERIOD} terkunci`, { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Lihat payroll run ini' })).toHaveAttribute(
        'href',
        `/payroll-runs/${run.id}`,
      );
      await expect(page.getByRole('button', { name: 'Rekonsiliasi' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Tambah Manual' })).toBeDisabled();
    } finally {
      await fx.cleanup();
    }
  });

  test('kasbon money fields freeze once a deduction has been drawn, requestDate stays editable', async ({
    page,
  }) => {
    const PERIOD = '2099-05';
    const api = adminApi();
    const fx = new FixtureSet(api);
    try {
      const org = await fx.createOrgScaffold();
      const employee = await fx.createEmployee(org);
      await fx.createSalaryMaster(employee.id, '8000000.00');
      // 2 installments so remainingBalance lands at 1,000,000 after one
      // deduction — NOT zero, so the kasbon stays `approved` rather than
      // flipping to the dead-end `paid_off` (which would lock Ubah/Hapus
      // entirely instead of the narrower money-fields-only freeze this test
      // targets, KasbonDetailPage.tsx's isDeadEnd check).
      const kasbon = await fx.createKasbon(employee.id, '2000000.00', '1000000.00', 2);
      await fx.approveKasbon(kasbon.id);
      const run = await fx.createPayrollRun(PERIOD);
      await fx.calculateAndWait(run.id);

      await page.goto(`/kasbon/${kasbon.id}`);
      await expect(page.getByRole('button', { name: 'Ubah' })).toBeEnabled();
      await page.getByRole('button', { name: 'Ubah' }).click();

      await expect(formFieldInput(page, 'Jumlah Kasbon (Rp)')).toBeDisabled();
      await expect(formFieldInput(page, 'Jumlah Cicilan')).toBeDisabled();
      await expect(formFieldInput(page, 'Nominal per Cicilan (Rp)')).toBeDisabled();
      await expect(formFieldInput(page, 'Tanggal Permintaan')).toBeEnabled();
    } finally {
      await fx.cleanup();
    }
  });

  test('surat ijin (R-06a, derivable): Ubah/Hapus lock once decided', async ({ page }) => {
    const api = adminApi();
    const fx = new FixtureSet(api);
    try {
      const org = await fx.createOrgScaffold();
      const employee = await fx.createEmployee(org);
      const suratIjin = await fx.createSuratIjin(employee.id, '2026-01-10');

      await page.goto(`/letters/surat-ijin/${suratIjin.id}`);
      await expect(page.getByRole('button', { name: 'Ubah' })).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Hapus' })).toBeEnabled();

      await page.getByRole('button', { name: 'Setujui' }).click();
      await expect(page.getByText('Disetujui')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ubah' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Hapus' })).toBeDisabled();
    } finally {
      await fx.cleanup();
    }
  });

  test('surat peringatan (R-06b, fallback): Ubah/Hapus stay enabled unconditionally', async ({
    page,
  }) => {
    const api = adminApi();
    const fx = new FixtureSet(api);
    try {
      const org = await fx.createOrgScaffold();
      const employee = await fx.createEmployee(org);
      const suratPeringatan = await fx.createSuratPeringatan(employee.id, '2026-01-10');

      await page.goto(`/letters/surat-peringatan/${suratPeringatan.id}`);
      // No client-derivable lock exists for this record (§13.5 B-06) — the
      // audit check IS that these stay enabled, with the server's 409 (if
      // ever referenced by a payslip line item) as the real authority.
      await expect(page.getByRole('button', { name: 'Ubah' })).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Hapus' })).toBeEnabled();
    } finally {
      await fx.cleanup();
    }
  });
});
