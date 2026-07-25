import type { PayrollRunStatus } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';

// Mirrors apps/api/src/modules/payroll-runs/entities/payroll-run.entity.ts.
//
// ⚠️ Verified against payroll-run-transitions.ts and PayrollRunStatus
// (shared-types) directly, not assumed: there are exactly 4 states, no
// 5th 'reverted'/'cancelled'/'calculating' value. Reverting moves a
// `calculated` run back to plain `draft` — it does not introduce a new
// status. Allowed transitions: draft→calculated, calculated→approved,
// calculated→draft (revert), approved→disbursed(terminal). No other edge
// exists — approved/disbursed never move backward, no stage-skipping.
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

// Mirrors CreatePayrollRunDto — period ('YYYY-MM') is the ONLY field. There
// is no separate "date" field on this DTO at all.
export interface PayrollRunFormValues {
  period: string;
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const { data } = await apiClient.get<PayrollRun[]>('/payroll-runs');
  return data;
}

export async function getPayrollRun(id: string): Promise<PayrollRun> {
  const { data } = await apiClient.get<PayrollRun>(`/payroll-runs/${id}`);
  return data;
}

export async function createPayrollRun(input: PayrollRunFormValues): Promise<PayrollRun> {
  const { data } = await apiClient.post<PayrollRun>('/payroll-runs', input);
  return data;
}

// §01_GENERAL/P8-T02 — genuinely ASYNC, verified against
// payroll-runs.controller.ts (@HttpCode(HttpStatus.ACCEPTED) = 202) and
// payroll-runs.service.ts's requestCalculation(), which enqueues a BullMQ
// job and returns immediately. The run's `status` stays 'draft' for the
// ENTIRE calculation — there is no 'calculating' enum value — and only
// flips to 'calculated' once the background job finishes (see the
// processor's calculatePayrollRun()). Progress is processedCount/totalCount
// on the run itself; the caller must poll GET /:id, not expect this call to
// return the final result.
export async function calculatePayrollRun(id: string): Promise<{ payrollRunId: string }> {
  const { data } = await apiClient.post<{ payrollRunId: string }>(
    `/payroll-runs/${id}/calculate`,
  );
  return data;
}

export async function approvePayrollRun(id: string): Promise<PayrollRun> {
  const { data } = await apiClient.put<PayrollRun>(`/payroll-runs/${id}/approve`);
  return data;
}

export async function disbursePayrollRun(id: string): Promise<PayrollRun> {
  const { data } = await apiClient.put<PayrollRun>(`/payroll-runs/${id}/disburse`);
  return data;
}

export async function revertPayrollRunToDraft(id: string): Promise<PayrollRun> {
  const { data } = await apiClient.put<PayrollRun>(`/payroll-runs/${id}/revert`);
  return data;
}
