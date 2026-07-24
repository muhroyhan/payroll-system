import { PayrollRunStatus } from '@payroll-system/shared-types';
import { isTransitionAllowed } from './payroll-run-transitions';

describe('isTransitionAllowed (P8-T01, §5.8/§11)', () => {
  it('allows the forward path draft → calculated → approved → disbursed', () => {
    expect(
      isTransitionAllowed(PayrollRunStatus.DRAFT, PayrollRunStatus.CALCULATED),
    ).toBe(true);
    expect(
      isTransitionAllowed(
        PayrollRunStatus.CALCULATED,
        PayrollRunStatus.APPROVED,
      ),
    ).toBe(true);
    expect(
      isTransitionAllowed(
        PayrollRunStatus.APPROVED,
        PayrollRunStatus.DISBURSED,
      ),
    ).toBe(true);
  });

  it('allows the single revert path: calculated → draft', () => {
    expect(
      isTransitionAllowed(PayrollRunStatus.CALCULATED, PayrollRunStatus.DRAFT),
    ).toBe(true);
  });

  // TC-PAYROLL-05 — approved/disbursed never move backward.
  it('rejects reverting an approved run', () => {
    expect(
      isTransitionAllowed(PayrollRunStatus.APPROVED, PayrollRunStatus.DRAFT),
    ).toBe(false);
    expect(
      isTransitionAllowed(
        PayrollRunStatus.APPROVED,
        PayrollRunStatus.CALCULATED,
      ),
    ).toBe(false);
  });

  it('rejects any move out of disbursed (terminal)', () => {
    for (const to of Object.values(PayrollRunStatus)) {
      expect(isTransitionAllowed(PayrollRunStatus.DISBURSED, to)).toBe(false);
    }
  });

  it('rejects stage-skipping (draft → approved, draft → disbursed, calculated → disbursed)', () => {
    expect(
      isTransitionAllowed(PayrollRunStatus.DRAFT, PayrollRunStatus.APPROVED),
    ).toBe(false);
    expect(
      isTransitionAllowed(PayrollRunStatus.DRAFT, PayrollRunStatus.DISBURSED),
    ).toBe(false);
    expect(
      isTransitionAllowed(
        PayrollRunStatus.CALCULATED,
        PayrollRunStatus.DISBURSED,
      ),
    ).toBe(false);
  });
});
