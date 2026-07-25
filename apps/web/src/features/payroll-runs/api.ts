import type { PayrollRunStatus } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';

// Mirrors apps/api/src/modules/payroll-runs/entities/payroll-run.entity.ts.
// Full payroll-runs CRUD/lifecycle (create/calculate/approve/disburse/
// revert/summary) is FE-T26..T29 — this read-only slice is pulled forward
// because FE-T17's attendance period lock (§11/TC-PAYROLL-04) needs to know
// run statuses per period.
export interface PayrollRun {
  id: string;
  period: string;
  status: PayrollRunStatus;
  createdBy: string;
  approvedBy: string | null;
  lockedAt: string | null;
  processedCount: number;
  totalCount: number;
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const { data } = await apiClient.get<PayrollRun[]>('/payroll-runs');
  return data;
}
