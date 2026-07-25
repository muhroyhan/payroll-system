import { apiClient } from '../../api/client';

// Mirrors salary-period-config.entity.ts — a single-tenant SINGLETON row
// (the service enforces "at most one row"; the schema doesn't). No `period`
// field, no relationship to payroll_runs at all (verified against
// salary-period-config.service.ts — no PayrollPeriodLockService import,
// no PayrollRun reference anywhere in this module). This is just two
// day-of-month integers; unlike attendance records (FE-T17) or the
// hypothesis this task asked to check, there is nothing here for a
// period-lock banner to attach to.
//
// GET has NO @Roles at all — any authenticated user can read (verified
// against salary-period-config.controller.ts); PUT is admin-only. The route
// itself is open to both roles (routes/access.ts); only the write action is
// gated in-screen against useAuth().isAdmin.
export interface SalaryPeriodConfig {
  id: string;
  attendanceCutoffDay: number;
  payrollDisbursementDay: number;
  updatedBy: string;
}

export interface SalaryPeriodConfigFormValues {
  attendanceCutoffDay: number;
  payrollDisbursementDay: number;
}

// A 404 here is a real, expected first-run state ("not configured yet"),
// not an error — verified against salary-period-config.service.ts's get().
export async function getSalaryPeriodConfig(): Promise<SalaryPeriodConfig> {
  const { data } = await apiClient.get<SalaryPeriodConfig>('/salary-period-config');
  return data;
}

export async function upsertSalaryPeriodConfig(
  input: SalaryPeriodConfigFormValues,
): Promise<SalaryPeriodConfig> {
  const { data } = await apiClient.put<SalaryPeriodConfig>('/salary-period-config', input);
  return data;
}
