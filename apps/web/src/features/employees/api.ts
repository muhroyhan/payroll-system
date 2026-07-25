import type {
  EmployeeActiveStatus,
  EmploymentStatus,
  Gender,
  MaritalStatus,
  PtkpStatus,
} from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';
import type { BulkImportResult } from '../../api/bulkImport';
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
