import { test, expect } from '@playwright/test';
import { EmployeeActiveStatus } from '../support/enums';
import { FixtureSet } from '../support/fixtures';
import { ADMIN_STORAGE_STATE, adminApi } from '../support/session';

// Most recent backend task (apps/api/test/prorate-and-exclusion.e2e-spec.ts,
// Task A/B) surfaced at the UI: a mid-period resignation prorates the
// payslip (Task A) and a resulting negative take-home excludes the employee
// from the run instead of failing it (Task B) — this walks the SAME
// scenario end to end through the real UI instead of asserting purely at
// the calculation-service level like the backend spec does.
test.use({ storageState: ADMIN_STORAGE_STATE });

const PERIOD = '2099-06';

// Mirrors PayslipDetailPage.tsx's own formatWorkedDays() exactly — the test
// reads truth from the API (never re-derives the prorate math itself, same
// R-07 discipline the app holds itself to) and only needs to match the same
// display formatting the component applies before asserting the banner text.
function formatWorkedDays(days: number): string {
  return Number.isInteger(days) ? String(days) : days.toFixed(2);
}

test.describe('Prorate + negative-net-pay exclusion (UI)', () => {
  test('resigned mid-period employee shows a prorata banner; negative-net employee is excluded with a reason', async ({
    page,
  }) => {
    const api = adminApi();
    const fx = new FixtureSet(api);
    try {
      const org = await fx.createOrgScaffold();

      const resigned = await fx.createEmployee(org, {
        startDate: '2020-01-01',
        endDate: `${PERIOD}-10`,
        status: EmployeeActiveStatus.INACTIVE,
      });
      await fx.createSalaryMaster(resigned.id, '6000000.00');

      const negativeNet = await fx.createEmployee(org);
      await fx.createSalaryMaster(negativeNet.id, '3000000.00');
      // Installment far exceeds what's left of gross after tax/BPJS —
      // engineers a negative net pay deterministically, same construction
      // as the backend integration test.
      const kasbon = await fx.createKasbon(negativeNet.id, '6000000.00', '6000000.00', 1);
      await fx.approveKasbon(kasbon.id);

      const run = await fx.createPayrollRun(PERIOD);
      await fx.calculateAndWait(run.id);

      // Ground truth from the same API the UI calls, so this test verifies
      // the UI renders it faithfully rather than re-deriving expectations.
      const runDetail = await api.get<{
        excludedEmployees?: Array<{ employeeId: string; reason: string }>;
      }>(`/payroll-runs/${run.id}`);
      const exclusion = runDetail.excludedEmployees?.find((e) => e.employeeId === negativeNet.id);
      expect(exclusion, 'negative-net employee must be excluded').toBeTruthy();
      expect(exclusion!.reason).toContain('Take-home negatif');

      const payslips = await api.get<
        Array<{ id: string; employeeId: string; workedDays: string | null; totalWorkingDays: number | null }>
      >(`/payslips?payrollRunId=${run.id}`);
      const resignedPayslip = payslips.find((p) => p.employeeId === resigned.id);
      expect(resignedPayslip, 'resigned employee must still get a payslip, not be dropped').toBeTruthy();
      expect(Number(resignedPayslip!.workedDays)).toBeLessThan(resignedPayslip!.totalWorkingDays!);

      // --- excluded-employee list, on the payroll run detail page ---
      await page.goto(`/payroll-runs/${run.id}`);
      await expect(
        page.getByText('1 karyawan dikecualikan dari perhitungan ini'),
      ).toBeVisible();
      const exclusionRow = page.getByRole('row', { name: new RegExp(negativeNet.name) });
      await expect(exclusionRow).toBeVisible();
      await expect(exclusionRow.getByText('Take-home negatif')).toBeVisible();

      // --- prorata banner, on the resigned employee's payslip detail page ---
      await page.getByRole('link', { name: 'Payslip' }).click();
      await page.getByRole('link', { name: resigned.name }).click();
      const expectedWorkedDays = formatWorkedDays(Number(resignedPayslip!.workedDays));
      await expect(
        page.getByText(
          `Prorata (${expectedWorkedDays} dari ${resignedPayslip!.totalWorkingDays} hari kerja)`,
        ),
      ).toBeVisible();
    } finally {
      await fx.cleanup();
    }
  });
});
