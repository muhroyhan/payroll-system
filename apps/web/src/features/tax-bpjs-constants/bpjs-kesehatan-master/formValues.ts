import dayjs, { type Dayjs } from 'dayjs';
import type { BpjsKesehatanMaster, BpjsKesehatanMasterFormValues } from './api';

export interface BpjsKesehatanMasterFormRuntimeValues {
  employeeRate: number;
  companyRate: number;
  wageCap: number;
  effectiveStartDate: Dayjs;
  effectiveEndDate?: Dayjs | null;
  reason?: string;
}

export function bpjsKesehatanMasterToRuntimeFormValues(
  record: BpjsKesehatanMaster,
): BpjsKesehatanMasterFormRuntimeValues {
  return {
    employeeRate: Number(record.employeeRate),
    companyRate: Number(record.companyRate),
    wageCap: Number(record.wageCap),
    effectiveStartDate: dayjs(record.effectiveStartDate),
    effectiveEndDate: record.effectiveEndDate ? dayjs(record.effectiveEndDate) : null,
  };
}

export function runtimeFormValuesToApi(
  values: BpjsKesehatanMasterFormRuntimeValues,
): BpjsKesehatanMasterFormValues {
  return {
    employeeRate: String(values.employeeRate),
    companyRate: String(values.companyRate),
    wageCap: String(values.wageCap),
    effectiveStartDate: values.effectiveStartDate.format('YYYY-MM-DD'),
    effectiveEndDate: values.effectiveEndDate
      ? values.effectiveEndDate.format('YYYY-MM-DD')
      : undefined,
    reason: values.reason || undefined,
  };
}
