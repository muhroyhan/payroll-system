import type {
  EmployeeActiveStatus,
  EmploymentStatus,
  Gender,
  MaritalStatus,
  PtkpStatus,
} from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';
import type { BulkImportResult } from '../../api/bulkImport';
import type { PaginatedResult, PaginationParams } from '../../api/pagination';
import type { OrgMasterRecord } from '../organization/api';

// Mirrors apps/api/src/modules/employees/entities/employee.entity.ts —
// base_salary is deliberately NOT here (§5.2, resolved via
// GET /salary-master/resolve instead, see hooks.ts).
export interface Employee {
  id: string;
  name: string;
  nik: string;
  npwp: string | null;
  ptkpStatus: PtkpStatus;
  maritalStatus: MaritalStatus;
  gender: Gender | null;
  dependentCount: number;
  wifeIncomeCombined: boolean;
  spouseNoIncomeCertificate: boolean;
  ptkpManuallyOverridden: boolean;
  // Audit-trail follow-up (dispute-traceability review, §D) — who/when/why
  // ptkpManuallyOverridden was switched on; null when it's never been
  // activated (or was switched back off, which clears all three together).
  ptkpOverriddenBy: string | null;
  ptkpOverriddenAt: string | null;
  ptkpOverriddenReason: string | null;
  employmentStatus: EmploymentStatus;
  employeeTypeId: string;
  employeeType?: OrgMasterRecord;
  positionId: string;
  position?: OrgMasterRecord;
  departmentId: string;
  department?: OrgMasterRecord;
  divisionId: string;
  division?: OrgMasterRecord;
  location: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolderName: string | null;
  startDate: string;
  endDate: string | null;
  status: EmployeeActiveStatus;
}

// Mirrors CreateEmployeeDto — dates as plain 'YYYY-MM-DD' strings; the form
// converts antd DatePicker's dayjs values before calling this.
export interface EmployeeFormValues {
  name: string;
  nik: string;
  npwp?: string;
  ptkpStatus?: PtkpStatus;
  maritalStatus: MaritalStatus;
  gender: Gender;
  dependentCount: number;
  wifeIncomeCombined?: boolean;
  spouseNoIncomeCertificate?: boolean;
  ptkpManuallyOverridden?: boolean;
  // Required by the API (BadRequestException) whenever ptkpManuallyOverridden
  // is being switched on false -> true; see EmployeeFormFields.
  ptkpOverrideReason?: string;
  employmentStatus: EmploymentStatus;
  employeeTypeId: string;
  positionId: string;
  departmentId: string;
  divisionId: string;
  location?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolderName?: string;
  startDate: string;
  endDate?: string;
  status?: EmployeeActiveStatus;
}

export async function listEmployees(): Promise<Employee[]> {
  const { data } = await apiClient.get<Employee[]>('/employees');
  return data;
}

export interface EmployeeListFilters {
  status?: EmployeeActiveStatus;
  departmentId?: string;
  divisionId?: string;
  positionId?: string;
  employeeTypeId?: string;
  // BUGS#9/#10 — server-side name/NIK search for EmployeeSelect.
  search?: string;
}

// BUGS#2 — GET /employees WITH page/limit gets the paginated
// {items,total,...} shape back (EmployeesService.list()'s doc comment);
// listEmployees() above (no params) is untouched for every dropdown/Select
// still calling it via useEmployeesQuery().
export async function listEmployeesPaginated(
  params: PaginationParams & EmployeeListFilters,
): Promise<PaginatedResult<Employee>> {
  const { data } = await apiClient.get<PaginatedResult<Employee>>('/employees', { params });
  return data;
}

export async function getEmployee(id: string): Promise<Employee> {
  const { data } = await apiClient.get<Employee>(`/employees/${id}`);
  return data;
}

export async function createEmployee(input: EmployeeFormValues): Promise<Employee> {
  const { data } = await apiClient.post<Employee>('/employees', input);
  return data;
}

export async function updateEmployee(
  id: string,
  input: Partial<EmployeeFormValues>,
): Promise<Employee> {
  const { data } = await apiClient.put<Employee>(`/employees/${id}`, input);
  return data;
}

// FE-T07 — POST /employees/import (multipart, field "file").
export async function importEmployees(file: File): Promise<BulkImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<BulkImportResult>('/employees/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
