import type { ScopeType } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';
import type { ScopeResolution } from '../scope-resolver/types';

// Mirrors apps/api/src/modules/incentive-master/entities/incentive-master.entity.ts
// — same shape as SalaryMaster (features/salary-master/api.ts) plus
// isBpjsEligible (§9 Step 2). incentiveAmount is a string (Sequelize DECIMAL).
export interface IncentiveMaster {
  id: string;
  scopeType: ScopeType;
  scopeValue: string;
  incentiveAmount: string;
  isBpjsEligible: boolean;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdBy: string;
}

// Mirrors CreateIncentiveMasterDto — incentiveAmount is @IsNumberString.
export interface IncentiveMasterFormValues {
  scopeType: ScopeType;
  scopeValue: string;
  incentiveAmount: string;
  isBpjsEligible: boolean;
  effectiveStartDate: string;
  effectiveEndDate?: string;
}

export async function listIncentiveMasters(): Promise<IncentiveMaster[]> {
  const { data } = await apiClient.get<IncentiveMaster[]>('/incentive-master');
  return data;
}

export async function createIncentiveMaster(
  input: IncentiveMasterFormValues,
): Promise<IncentiveMaster> {
  const { data } = await apiClient.post<IncentiveMaster>('/incentive-master', input);
  return data;
}

export async function updateIncentiveMaster(
  id: string,
  input: Partial<IncentiveMasterFormValues>,
): Promise<IncentiveMaster> {
  const { data } = await apiClient.put<IncentiveMaster>(`/incentive-master/${id}`, input);
  return data;
}

export async function resolveIncentiveForEmployee(
  employeeId: string,
  asOf?: string,
): Promise<ScopeResolution<IncentiveMaster>> {
  const { data } = await apiClient.get<ScopeResolution<IncentiveMaster>>(
    '/incentive-master/resolve',
    { params: { employeeId, asOf } },
  );
  return data;
}
