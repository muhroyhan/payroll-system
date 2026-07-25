import type { ScopeType } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';
import type { PayslipComponent } from '../payslip-components/api';

// Mirrors payslip-temp-component.entity.ts. list()/findOne() include
// ['component'] (verified against payslip-temp-components.service.ts).
//
// ⚠️ periodYear/periodMonth are the real schema (§5.2) — effectiveStartDate/
// effectiveEndDate exist on the row too but are purely DERIVED (first/last
// day of that month) so the backend can reuse ScopeResolverService; they are
// NOT a second effective-dating UI concept like salary/incentive master
// (FE-T09/T10). This screen is period-bound, not effective-dated — no
// EffectiveDatedMasterPage, no "Akhiri Masa Berlaku" (there is a real DELETE
// endpoint here, unlike those masters).
//
// ⚠️ No lock at all. Verified against payslip-temp-components.service.ts:
// update()/remove() have zero restriction — no status check, no
// payslip-reference check, nothing. The entity's own comment admits this is
// a documented gap ("05_BOUNDARIES_AND_TESTS.md never mentions a lock... add
// a guard if/when Phase 8 confirms one is needed"). Also NOT wired to the
// payroll-period lock the way attendance_records is (no
// PayrollPeriodLockService import anywhere in this module) — editing a temp
// component for an already-calculated/approved period is currently
// possible, which looks like the same class of problem attendance records
// solved. Flagged here rather than building a client-side-only "lock" that
// the server wouldn't actually enforce (that would misrepresent what the
// app does — R-06's disabling must reflect real backend behavior).
export interface PayslipTempComponent {
  id: string;
  componentId: string;
  component?: PayslipComponent;
  scopeType: ScopeType;
  scopeValue: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdBy: string;
}

export interface PayslipTempComponentFormValues {
  componentId: string;
  scopeType: ScopeType;
  scopeValue: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
}

export async function listPayslipTempComponents(): Promise<PayslipTempComponent[]> {
  const { data } = await apiClient.get<PayslipTempComponent[]>('/payslip-temp-components');
  return data;
}

export async function getPayslipTempComponent(id: string): Promise<PayslipTempComponent> {
  const { data } = await apiClient.get<PayslipTempComponent>(`/payslip-temp-components/${id}`);
  return data;
}

export async function createPayslipTempComponent(
  input: PayslipTempComponentFormValues,
): Promise<PayslipTempComponent> {
  const { data } = await apiClient.post<PayslipTempComponent>('/payslip-temp-components', input);
  return data;
}

export async function updatePayslipTempComponent(
  id: string,
  input: Partial<PayslipTempComponentFormValues>,
): Promise<PayslipTempComponent> {
  const { data } = await apiClient.put<PayslipTempComponent>(
    `/payslip-temp-components/${id}`,
    input,
  );
  return data;
}

export async function removePayslipTempComponent(id: string): Promise<void> {
  await apiClient.delete(`/payslip-temp-components/${id}`);
}

// §5.2 — "active" preview for one employee/date. Unlike salary/incentive's
// resolve (one winner), more than one component can be simultaneously
// active, so this returns an array — never picks a single winner (R-13).
export async function listActivePayslipTempComponents(
  employeeId: string,
  asOf?: string,
): Promise<PayslipTempComponent[]> {
  const { data } = await apiClient.get<PayslipTempComponent[]>('/payslip-temp-components/active', {
    params: { employeeId, asOf },
  });
  return data;
}
