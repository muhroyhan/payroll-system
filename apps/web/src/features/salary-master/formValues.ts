import dayjs, { type Dayjs } from 'dayjs';
import type { ScopeType } from '@payroll-system/shared-types';
import type { SalaryMaster, SalaryMasterFormValues } from './api';

// antd's DatePicker/InputNumber work in Dayjs/number; the API wire format
// (SalaryMasterFormValues) uses plain date strings and a numeric string for
// baseSalary (CreateSalaryMasterDto's @IsNumberString). This is the one seam
// where the two meet.
export interface SalaryMasterFormRuntimeValues {
  scopeType: ScopeType;
  scopeValue: string;
  baseSalary: number;
  effectiveStartDate: Dayjs;
  effectiveEndDate?: Dayjs | null;
}

export function salaryMasterToRuntimeFormValues(
  record: SalaryMaster,
): SalaryMasterFormRuntimeValues {
  return {
    scopeType: record.scopeType,
    scopeValue: record.scopeValue,
    baseSalary: Number(record.baseSalary),
    effectiveStartDate: dayjs(record.effectiveStartDate),
    effectiveEndDate: record.effectiveEndDate ? dayjs(record.effectiveEndDate) : null,
  };
}

export function runtimeFormValuesToApi(
  values: SalaryMasterFormRuntimeValues,
): SalaryMasterFormValues {
  return {
    scopeType: values.scopeType,
    scopeValue: values.scopeValue,
    baseSalary: String(values.baseSalary),
    effectiveStartDate: values.effectiveStartDate.format('YYYY-MM-DD'),
    effectiveEndDate: values.effectiveEndDate
      ? values.effectiveEndDate.format('YYYY-MM-DD')
      : undefined,
  };
}
