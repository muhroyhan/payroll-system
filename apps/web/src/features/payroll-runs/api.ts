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
// Task B — one employee excluded from this run's payslip generation instead
// of failing the whole run (negative computed net pay). Mirrors
// apps/api/src/modules/payroll-runs/entities/payroll-run-excluded-employee.entity.ts.
export interface PayrollRunExcludedEmployee {
  id: string;
  employeeId: string;
  employee: { id: string; name: string } | null;
  reason: string;
  grossPay: string;
  netPay: string;
}

export interface PayrollRun {
  id: string;
  period: string;
  status: PayrollRunStatus;
  createdBy: string;
  approvedBy: string | null;
  lockedAt: string | null;
  processedCount: number;
  totalCount: number;
  // Eager-loaded ONLY by GET /payroll-runs/:id (payroll-runs.service.ts
  // findByIdOrThrow) — GET /payroll-runs (the list) does NOT include it, so
  // this is absent there. Empty array until the run has actually been
  // calculated with at least one exclusion.
  excludedEmployees?: PayrollRunExcludedEmployee[];
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

// Mirrors PayrollRunSummary/PayrollRunSummaryTotals in
// apps/api/src/modules/payroll-runs/payroll-run-summary.service.ts — pure
// server-side aggregation over a run's final payslips (P8-T06). Every field
// here is displayed as-is; nothing is recomputed client-side (R-07).
export interface PayrollRunSummaryTotals {
  employeeCount: number;
  grossPay: number;
  taxableGross: number;
  pph21Amount: number;
  bpjsKesehatanEmployee: number;
  bpjsKesehatanCompany: number;
  bpjsJhtEmployee: number;
  bpjsJhtCompany: number;
  bpjsJpEmployee: number;
  bpjsJpCompany: number;
  bpjsJkkCompany: number;
  bpjsJkmCompany: number;
  netPay: number;
}

export interface PayrollRunDepartmentSummary extends PayrollRunSummaryTotals {
  departmentId: string | null;
  departmentName: string;
}

export interface PayrollRunSummary {
  payrollRunId: string;
  period: string;
  status: PayrollRunStatus;
  totals: PayrollRunSummaryTotals;
  byDepartment: PayrollRunDepartmentSummary[];
}

// A `draft` run's summary 409s (no payslips yet, §5.8) — the page renders
// that as an explanatory empty state, not a toast (§15.12).
export async function getPayrollRunSummary(id: string): Promise<PayrollRunSummary> {
  const { data } = await apiClient.get<PayrollRunSummary>(`/payroll-runs/${id}/summary`);
  return data;
}

// Verified against payroll-runs.controller.ts: GET /:id/summary/csv is a
// dedicated StreamableFile endpoint (text/csv), not a client-side CSV
// generation — no separate "build CSV from fetched JSON" step needed. It
// sits behind the same JwtAuthGuard as everything else, so it must go
// through useDownloadPdf's blob-fetch helper, never a plain <a href>.
export function payrollRunSummaryCsvUrl(id: string): string {
  return `/payroll-runs/${id}/summary/csv`;
}
