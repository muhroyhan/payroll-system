import { randomUUID } from 'node:crypto';
// Local mirror, not imported from @payroll-system/shared-types — see
// support/enums.ts's header comment for why (a Playwright-loader-specific
// module resolution issue with that package's CJS build, not a real
// divergence this suite wants).
import {
  EmployeeActiveStatus,
  EmploymentStatus,
  Gender,
  MaritalStatus,
  PayrollRunStatus,
  PtkpStatus,
  Role,
  ScopeType,
  SPLevel,
  SuratIjinType,
} from './enums';
import type { ApiContext } from './apiClient';
import { exec } from './db';
import { FIXTURE_TAG, HR_STAFF_CREDENTIALS } from './env';

/** Numeric-only tag variant for the `nik` column (16 digits, no free text
 *  allowed) — timestamp + random suffix keeps it unique across parallel
 *  workers within one run, distinct from the backend's own e2e-spec nik()
 *  helper only in that it doesn't need to be — just needs to not collide. */
function nik(): string {
  return `9${Date.now()}${Math.floor(Math.random() * 10000)}`.slice(0, 16).padEnd(16, '0');
}

export function tag(label: string): string {
  return `${FIXTURE_TAG} ${label} ${randomUUID().slice(0, 8)}`;
}

export interface OrgScaffold {
  divisionId: string;
  departmentId: string;
  positionId: string;
  employeeTypeId: string;
}

export interface EmployeeRecord {
  id: string;
  name: string;
}

/**
 * Everything a spec file creates during one test, plus its own teardown.
 * Every entity this suite touches is reachable from either an employeeId or
 * a payrollRunId (kasbon/attendance/letters hang off employees; payslips/
 * exclusions/deductions hang off the run) — so cleanup only needs to track
 * those two id lists plus the org master ids, not one list per table.
 * afterEach calls `cleanup()` unconditionally (even on assertion failure,
 * since it's outside the try/expect), so fixtures never accumulate across
 * runs; the global-teardown safety net (globalTeardown.ts) exists only for
 * the case where the *process* dies mid-test, not the individual test.
 */
export class FixtureSet {
  private employeeIds: string[] = [];
  private payrollRunIds: string[] = [];
  private orgIds: OrgScaffold[] = [];

  constructor(private readonly api: ApiContext) {}

  async createOrgScaffold(): Promise<OrgScaffold> {
    const [division, department, position, employeeType] = await Promise.all([
      this.api.post<{ id: string }>('/divisions', { name: tag('Division') }),
      this.api.post<{ id: string }>('/departments', { name: tag('Department') }),
      this.api.post<{ id: string }>('/positions', { name: tag('Position') }),
      this.api.post<{ id: string }>('/employee-types', { name: tag('EmployeeType') }),
    ]);
    const org: OrgScaffold = {
      divisionId: division.id,
      departmentId: department.id,
      positionId: position.id,
      employeeTypeId: employeeType.id,
    };
    this.orgIds.push(org);
    return org;
  }

  async createEmployee(
    org: OrgScaffold,
    overrides: {
      name?: string;
      startDate?: string;
      endDate?: string;
      status?: EmployeeActiveStatus;
    } = {},
  ): Promise<EmployeeRecord> {
    const employee = await this.api.post<EmployeeRecord>('/employees', {
      name: overrides.name ?? tag('Employee'),
      nik: nik(),
      maritalStatus: MaritalStatus.SINGLE,
      gender: Gender.MALE,
      dependentCount: 0,
      ptkpManuallyOverridden: true,
      // Forces TER category A, which 0002-seed-tax-bpjs-constants.js always
      // seeds regardless of environment — no need to also create tax/BPJS
      // masters per fixture.
      ptkpStatus: PtkpStatus.TK_0,
      employmentStatus: EmploymentStatus.TETAP,
      employeeTypeId: org.employeeTypeId,
      positionId: org.positionId,
      departmentId: org.departmentId,
      divisionId: org.divisionId,
      startDate: overrides.startDate ?? '2020-01-01',
      endDate: overrides.endDate,
      status: overrides.status ?? EmployeeActiveStatus.ACTIVE,
    });
    this.employeeIds.push(employee.id);
    return employee;
  }

  async createSalaryMaster(employeeId: string, baseSalary: string, effectiveStartDate = '2020-01-01') {
    return this.api.post('/salary-master', {
      scopeType: ScopeType.EMPLOYEE,
      scopeValue: employeeId,
      baseSalary,
      effectiveStartDate,
    });
  }

  async createAttendanceRecord(
    employeeId: string,
    date: string,
    overrides: { clockIn?: string; clockOut?: string; overtimeHours?: number } = {},
  ) {
    return this.api.post('/attendance-records', {
      employeeId,
      date,
      clockIn: overrides.clockIn ?? `${date}T08:00:00.000Z`,
      clockOut: overrides.clockOut ?? `${date}T17:00:00.000Z`,
      overtimeHours: overrides.overtimeHours ?? 0,
    });
  }

  async createKasbon(
    employeeId: string,
    amount: string,
    installmentAmount: string,
    installmentCount = 1,
    requestDate = '2020-01-01',
  ): Promise<{ id: string }> {
    return this.api.post('/kasbon', {
      employeeId,
      amount,
      requestDate,
      installmentCount,
      installmentAmount,
    });
  }

  approveKasbon(id: string) {
    return this.api.put(`/kasbon/${id}/approve`);
  }

  async createSuratIjin(employeeId: string, date: string): Promise<{ id: string }> {
    return this.api.post('/surat-ijin', {
      employeeId,
      date,
      type: SuratIjinType.LATE_ARRIVAL,
      reason: tag('SuratIjin reason'),
      timeRequested: '08:30',
    });
  }

  approveSuratIjin(id: string) {
    return this.api.put(`/surat-ijin/${id}/approve`);
  }

  async createSuratPeringatan(employeeId: string, issueDate: string): Promise<{ id: string }> {
    return this.api.post('/surat-peringatan', {
      employeeId,
      level: SPLevel.SP1,
      violationDescription: tag('SuratPeringatan violation'),
      issueDate,
      // No FK constraint on issued_by (verified against the migration) — it's
      // an audit-trail user id, not something the letter's own lock derives
      // from, so the currently-authenticated user's id is exactly right here.
      issuedBy: this.api.userId,
    });
  }

  async createPayrollRun(period: string): Promise<{ id: string; period: string; status: PayrollRunStatus }> {
    const run = await this.api.post<{ id: string; period: string; status: PayrollRunStatus }>(
      '/payroll-runs',
      { period },
    );
    this.payrollRunIds.push(run.id);
    return run;
  }

  /** POSTs /calculate (202, fire-and-forget job) then polls GET /:id until
   *  the run leaves `draft` — mirrors PayrollRunDetailPage's own polling
   *  loop (usePayrollRunQuery's refetchInterval), just without React Query. */
  async calculateAndWait(
    id: string,
    timeoutMs = 30_000,
  ): Promise<{ id: string; status: PayrollRunStatus; excludedEmployees?: unknown[] }> {
    await this.api.post(`/payroll-runs/${id}/calculate`);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const run = await this.api.get<{ id: string; status: PayrollRunStatus }>(
        `/payroll-runs/${id}`,
      );
      if (run.status !== PayrollRunStatus.DRAFT) return run;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Payroll run ${id} did not leave 'draft' within ${timeoutMs}ms`);
  }

  /** Direct-DB cleanup, children before parents. Safe to call even if some
   *  ids were never actually persisted (e.g. a mid-test throw) — every
   *  DELETE is a no-op on ids that don't exist. */
  async cleanup(): Promise<void> {
    await deleteFixturesByIds(this.employeeIds, this.payrollRunIds);
    for (const org of this.orgIds) {
      await deleteOrgScaffold(org);
    }
    this.payrollRunIds = [];
    this.employeeIds = [];
    this.orgIds = [];
  }
}

function placeholders(n: number): string {
  return Array(n).fill('?').join(',');
}

/**
 * The cascade-delete core, shared by FixtureSet.cleanup() (afterEach, scoped
 * to one test's own ids) and global-teardown.ts's safety-net sweep (scoped
 * to whatever's still tagged E2E_TEST_FIXTURE after the whole suite ran —
 * i.e. leftovers from a test that crashed before its afterEach could run).
 * Same children-before-parents order either way: payroll-run-owned rows
 * first, then employee-owned rows, then the runs/employees themselves.
 */
export async function deleteFixturesByIds(
  employeeIds: string[],
  payrollRunIds: string[],
): Promise<void> {
  if (payrollRunIds.length > 0) {
    await exec(
      `DELETE pli FROM payslip_line_items pli JOIN payslips p ON pli.payslip_id = p.id WHERE p.payroll_run_id IN (${placeholders(payrollRunIds.length)})`,
      payrollRunIds,
    );
    await exec(
      `DELETE FROM payslips WHERE payroll_run_id IN (${placeholders(payrollRunIds.length)})`,
      payrollRunIds,
    );
    await exec(
      `DELETE FROM payroll_run_excluded_employees WHERE payroll_run_id IN (${placeholders(payrollRunIds.length)})`,
      payrollRunIds,
    );
  }
  if (employeeIds.length > 0) {
    await exec(
      `DELETE kd FROM kasbon_deductions kd JOIN kasbon k ON kd.kasbon_id = k.id WHERE k.employee_id IN (${placeholders(employeeIds.length)})`,
      employeeIds,
    );
    await exec(`DELETE FROM kasbon WHERE employee_id IN (${placeholders(employeeIds.length)})`, employeeIds);
    await exec(
      `DELETE FROM attendance_records WHERE employee_id IN (${placeholders(employeeIds.length)})`,
      employeeIds,
    );
    await exec(`DELETE FROM surat_ijin WHERE employee_id IN (${placeholders(employeeIds.length)})`, employeeIds);
    await exec(
      `DELETE FROM surat_peringatan WHERE employee_id IN (${placeholders(employeeIds.length)})`,
      employeeIds,
    );
    await exec(
      `DELETE FROM salary_masters WHERE scope_type = 'employee' AND scope_value IN (${placeholders(employeeIds.length)})`,
      employeeIds,
    );
  }
  if (payrollRunIds.length > 0) {
    await exec(
      `DELETE FROM payroll_runs WHERE id IN (${placeholders(payrollRunIds.length)})`,
      payrollRunIds,
    );
  }
  if (employeeIds.length > 0) {
    await exec(`DELETE FROM employees WHERE id IN (${placeholders(employeeIds.length)})`, employeeIds);
  }
}

export async function deleteOrgScaffold(org: OrgScaffold): Promise<void> {
  await exec('DELETE FROM divisions WHERE id = ?', [org.divisionId]);
  await exec('DELETE FROM departments WHERE id = ?', [org.departmentId]);
  await exec('DELETE FROM positions WHERE id = ?', [org.positionId]);
  await exec('DELETE FROM employee_types WHERE id = ?', [org.employeeTypeId]);
}

/** Idempotent — reused across runs since /users has no delete endpoint
 *  (only deactivate), so global setup must not create a new row every time
 *  the suite runs. Returns the credentials either way; the account is
 *  reactivated if a previous run left it deactivated. */
export async function ensureHrStaffTestUser(adminApi: ApiContext): Promise<void> {
  const users = await adminApi.get<Array<{ id: string; email: string; isActive: boolean }>>('/users');
  const existing = users.find((u) => u.email === HR_STAFF_CREDENTIALS.email);
  if (!existing) {
    await adminApi.post('/users', {
      name: HR_STAFF_CREDENTIALS.name,
      email: HR_STAFF_CREDENTIALS.email,
      password: HR_STAFF_CREDENTIALS.password,
      role: Role.HR_STAFF,
    });
    return;
  }
  if (!existing.isActive) {
    await adminApi.put(`/users/${existing.id}/reactivate`);
  }
}
