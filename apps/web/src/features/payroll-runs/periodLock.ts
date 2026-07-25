import { PayrollRunStatus } from '@payroll-system/shared-types';
import type { PayrollRun } from './api';

// Mirrors PayrollPeriodLockService.isPeriodLocked (payroll-period-lock.service.ts)
// exactly: a period ('YYYY-MM') is locked the moment ANY run for it is past
// draft. This is a plain status check on already-fetched data (like
// `status !== 'pending'` elsewhere, R-06a) — not a business-rule
// re-implementation (R-13 is about scope RESOLUTION, not this). A write
// attempt still hits the server's real 409 if this misses a race; this only
// drives the pre-emptive UI disable (R-06).
export function findLockingRun(
  period: string,
  runs: PayrollRun[] | undefined,
): PayrollRun | undefined {
  return runs?.find((run) => run.period === period && run.status !== PayrollRunStatus.DRAFT);
}
