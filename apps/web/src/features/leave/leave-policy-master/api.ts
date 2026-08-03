import type { ScopeType } from '@payroll-system/shared-types';
import { apiClient } from '../../../api/client';
import type { ScopeResolution } from '../../scope-resolver/types';

// Mirrors leave-policy-master.entity.ts. GET /leave-policy-master (list)
// does NOT include the leaveType association (verified against
// leave-policy-master.service.ts's plain findAll()) — leaveType?.name is
// never populated by the list endpoint; the page looks the name up from
// useLeaveTypesQuery instead of a second lookup implementation.
export interface LeavePolicyMaster {
  id: string;
  leaveTypeId: string;
  scopeType: ScopeType;
  scopeValue: string;
  annualQuota: number;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdBy: string;
  updatedBy: string | null;
  // BUGS#19 -- eager-loaded (id/name only) by the backend list().
  updatedByUser?: { id: string; name: string } | null;
  reason: string | null;
  supersedesId: string | null;
}

// Mirrors CreateLeavePolicyMasterDto. `reason` is only enforced
// server-side when this update closes off effectiveEndDate — and (audit-trail
// follow-up §1C) leave-policy-master now has the same assertLockedFieldsUntouched
// guard as the other 6 masters (checked against leave_balances.resolved_from_policy_id).
// R-06b (09_FRONTEND_GENERAL.md B-06) applies here, same as the other 6 —
// no isLocked flag on this response, so the 409 is surfaced reactively by
// FormDrawer's built-in conflict modal rather than a proactively-disabled
// field; upgrading to R-06a would need a backend isLocked flag, out of scope here.
export interface LeavePolicyMasterFormValues {
  leaveTypeId: string;
  scopeType: ScopeType;
  scopeValue: string;
  annualQuota: number;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  reason?: string;
}

export async function listLeavePolicyMasters(): Promise<LeavePolicyMaster[]> {
  const { data } = await apiClient.get<LeavePolicyMaster[]>('/leave-policy-master');
  return data;
}

export async function createLeavePolicyMaster(
  input: LeavePolicyMasterFormValues,
): Promise<LeavePolicyMaster> {
  const { data } = await apiClient.post<LeavePolicyMaster>('/leave-policy-master', input);
  return data;
}

export async function updateLeavePolicyMaster(
  id: string,
  input: Partial<LeavePolicyMasterFormValues>,
): Promise<LeavePolicyMaster> {
  const { data } = await apiClient.put<LeavePolicyMaster>(
    `/leave-policy-master/${id}`,
    input,
  );
  return data;
}

export async function resolveLeavePolicyForEmployee(
  employeeId: string,
  leaveTypeId: string,
  asOf?: string,
): Promise<ScopeResolution<LeavePolicyMaster>> {
  const { data } = await apiClient.get<ScopeResolution<LeavePolicyMaster>>(
    '/leave-policy-master/resolve',
    { params: { employeeId, leaveTypeId, asOf } },
  );
  return data;
}
