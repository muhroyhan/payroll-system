import { ScopeType } from '@payroll-system/shared-types';
import { useOrgMasterListQuery } from '../organization/hooks';
import { useEmployeesQuery } from '../employees/hooks';

interface NamedRecord {
  id: string;
  name: string;
}

export interface ScopeReferenceData {
  isLoading: boolean;
  optionsFor: (scopeType: ScopeType | undefined) => { value: string; label: string }[];
  labelFor: (scopeType: ScopeType, scopeValue: string) => string;
}

// FE-T09 (09_FRONTEND_STEPS.md) — the one place that knows "a scope_value is
// a division id when scope_type=division, an employee id when
// scope_type=employee, etc." (§5.2). Feeds BOTH ScopeSelector (the picker,
// this task) and every scope-master list's "Cakupan" column (the display),
// so a scope_value never needs a second lookup implementation.
export function useScopeReferenceData(): ScopeReferenceData {
  const divisionsQuery = useOrgMasterListQuery('divisions');
  const departmentsQuery = useOrgMasterListQuery('departments');
  const positionsQuery = useOrgMasterListQuery('positions');
  const employeeTypesQuery = useOrgMasterListQuery('employeeTypes');
  const employeesQuery = useEmployeesQuery();

  const isLoading =
    divisionsQuery.isLoading ||
    departmentsQuery.isLoading ||
    positionsQuery.isLoading ||
    employeeTypesQuery.isLoading ||
    employeesQuery.isLoading;

  const listFor = (scopeType: ScopeType | undefined): NamedRecord[] => {
    switch (scopeType) {
      case ScopeType.DIVISION:
        return divisionsQuery.data ?? [];
      case ScopeType.DEPARTMENT:
        return departmentsQuery.data ?? [];
      case ScopeType.POSITION:
        return positionsQuery.data ?? [];
      case ScopeType.EMPLOYEE_TYPE:
        return employeeTypesQuery.data ?? [];
      case ScopeType.EMPLOYEE:
        return employeesQuery.data ?? [];
      default:
        return [];
    }
  };

  const optionsFor = (scopeType: ScopeType | undefined) =>
    listFor(scopeType).map((record) => ({ value: record.id, label: record.name }));

  const labelFor = (scopeType: ScopeType, scopeValue: string) =>
    listFor(scopeType).find((record) => record.id === scopeValue)?.name ?? scopeValue;

  return { isLoading, optionsFor, labelFor };
}
