import { PayrollRunStatus } from '@payroll-system/shared-types';

// §5.8/§11 — the payroll run lifecycle as an explicit, forward-only state
// machine with a single revert path. Pure/stateless so the allowed/forbidden
// transitions are unit-testable without a DB.
//
//   draft ──► calculated ──► approved ──► disbursed(terminal)
//              │      ▲
//              └──────┘  revert (calculated → draft only)
//
// No stage-skipping, no moving backward once approved (TC-PAYROLL-05).
const ALLOWED_TRANSITIONS: Record<PayrollRunStatus, PayrollRunStatus[]> = {
  [PayrollRunStatus.DRAFT]: [PayrollRunStatus.CALCULATED],
  [PayrollRunStatus.CALCULATED]: [
    PayrollRunStatus.APPROVED, // forward
    PayrollRunStatus.DRAFT, // revert (invalidates still-draft payslips, P8-T04)
  ],
  [PayrollRunStatus.APPROVED]: [PayrollRunStatus.DISBURSED],
  [PayrollRunStatus.DISBURSED]: [], // terminal — fully immutable
};

export function isTransitionAllowed(
  from: PayrollRunStatus,
  to: PayrollRunStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
