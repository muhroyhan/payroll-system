import dayjs, { type Dayjs } from 'dayjs';
import type { Employee, EmployeeFormValues } from './api';

// antd's DatePicker works in Dayjs; the API wire format (EmployeeFormValues)
// uses plain 'YYYY-MM-DD' strings (CreateEmployeeDto's @IsDateString). This
// is the one seam where the two meet — nowhere else in the employees feature
// touches dayjs directly.
export type EmployeeFormRuntimeValues = Omit<EmployeeFormValues, 'startDate' | 'endDate'> & {
  startDate: Dayjs;
  endDate?: Dayjs | null;
};

// `gender` is nullable on the entity only for legacy rows predating that
// column (employee.entity.ts) — the form still requires picking one (§5.1a),
// so a legacy null just starts the Select empty rather than pre-filled.
export function employeeToRuntimeFormValues(employee: Employee): Partial<EmployeeFormRuntimeValues> {
  return {
    name: employee.name,
    nik: employee.nik,
    npwp: employee.npwp ?? undefined,
    ptkpStatus: employee.ptkpStatus,
    maritalStatus: employee.maritalStatus,
    gender: employee.gender ?? undefined,
    dependentCount: employee.dependentCount,
    wifeIncomeCombined: employee.wifeIncomeCombined,
    spouseNoIncomeCertificate: employee.spouseNoIncomeCertificate,
    ptkpManuallyOverridden: employee.ptkpManuallyOverridden,
    employmentStatus: employee.employmentStatus,
    employeeTypeId: employee.employeeTypeId,
    positionId: employee.positionId,
    departmentId: employee.departmentId,
    divisionId: employee.divisionId,
    location: employee.location ?? undefined,
    bankName: employee.bankName ?? undefined,
    bankAccountNumber: employee.bankAccountNumber ?? undefined,
    bankAccountHolderName: employee.bankAccountHolderName ?? undefined,
    startDate: dayjs(employee.startDate),
    endDate: employee.endDate ? dayjs(employee.endDate) : null,
    status: employee.status,
  };
}

export function runtimeFormValuesToApi(values: EmployeeFormRuntimeValues): EmployeeFormValues {
  return {
    ...values,
    startDate: values.startDate.format('YYYY-MM-DD'),
    endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
  };
}
