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
}

// Mirrors CreateLeavePolicyMasterDto.
export interface LeavePolicyMasterFormValues {
  leaveTypeId: string;
  scopeType: ScopeType;
  scopeValue: string;
  annualQuota: number;
  effectiveStartDate: string;
  effectiveEndDate?: string;
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
