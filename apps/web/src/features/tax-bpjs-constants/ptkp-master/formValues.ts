import dayjs, { type Dayjs } from 'dayjs';
import type { PtkpStatus } from '@payroll-system/shared-types';
import type { PtkpMaster, PtkpMasterFormValues } from './api';

export interface PtkpMasterFormRuntimeValues {
  ptkpStatus: PtkpStatus;
  amount: number;
  effectiveStartDate: Dayjs;
  effectiveEndDate?: Dayjs | null;
  reason?: string;
}

export function ptkpMasterToRuntimeFormValues(record: PtkpMaster): PtkpMasterFormRuntimeValues {
  return {
    ptkpStatus: record.ptkpStatus,
    amount: Number(record.amount),
    effectiveStartDate: dayjs(record.effectiveStartDate),
    effectiveEndDate: record.effectiveEndDate ? dayjs(record.effectiveEndDate) : null,
  };
}

export function runtimeFormValuesToApi(
  values: PtkpMasterFormRuntimeValues,
): PtkpMasterFormValues {
  return {
    ptkpStatus: values.ptkpStatus,
    amount: String(values.amount),
    effectiveStartDate: values.effectiveStartDate.format('YYYY-MM-DD'),
    effectiveEndDate: values.effectiveEndDate
      ? values.effectiveEndDate.format('YYYY-MM-DD')
      : undefined,
    reason: values.reason || undefined,
  };
}
