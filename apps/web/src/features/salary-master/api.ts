import type { ScopeType } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';
import type { ScopeResolution } from '../scope-resolver/types';

// Mirrors apps/api/src/modules/salary-master/entities/salary-master.entity.ts.
// baseSalary comes back as a string (Sequelize DECIMAL) — parse before
// formatting with formatIDR (components/format.ts).
export interface SalaryMaster {
  id: string;
  scopeType: ScopeType;
  scopeValue: string;
  baseSalary: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdBy: string;
  updatedBy: string | null;
  // BUGS#19 -- eager-loaded (id/name only) by the backend list().
  updatedByUser?: { id: string; name: string } | null;
  reason: string | null;
  supersedesId: string | null;
}

// Mirrors CreateSalaryMasterDto — baseSalary is an @IsNumberString, so the
// wire format is a numeric string, not a JSON number. `reason` is only
// enforced server-side when this update closes off effectiveEndDate.
export interface SalaryMasterFormValues {
  scopeType: ScopeType;
  scopeValue: string;
  baseSalary: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  reason?: string;
}

export async function listSalaryMasters(): Promise<SalaryMaster[]> {
  const { data } = await apiClient.get<SalaryMaster[]>('/salary-master');
  return data;
}

export async function createSalaryMaster(
  input: SalaryMasterFormValues,
): Promise<SalaryMaster> {
  const { data } = await apiClient.post<SalaryMaster>('/salary-master', input);
  return data;
}

export async function updateSalaryMaster(
  id: string,
  input: Partial<SalaryMasterFormValues>,
): Promise<SalaryMaster> {
  const { data } = await apiClient.put<SalaryMaster>(`/salary-master/${id}`, input);
  return data;
}

// §5.4/§15.4 — the employee detail page's read-only resolved-salary panel
// (FE-T06) and this task's own preview panel both call this.
export async function resolveSalaryForEmployee(
  employeeId: string,
  asOf?: string,
): Promise<ScopeResolution<SalaryMaster>> {
  const { data } = await apiClient.get<ScopeResolution<SalaryMaster>>(
    '/salary-master/resolve',
    { params: { employeeId, asOf } },
  );
  return data;
}
