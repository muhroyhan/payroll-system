import dayjs, { type Dayjs } from 'dayjs';
import type { TerCategory } from '@payroll-system/shared-types';
import type { TerBracketMaster, TerBracketMasterFormValues } from './api';

export interface TerBracketMasterFormRuntimeValues {
  terCategory: TerCategory;
  incomeLowerBound: number;
  incomeUpperBound?: number;
  rate: number;
  effectiveStartDate: Dayjs;
  effectiveEndDate?: Dayjs | null;
  reason?: string;
}

export function terBracketMasterToRuntimeFormValues(
  record: TerBracketMaster,
): TerBracketMasterFormRuntimeValues {
  return {
    terCategory: record.terCategory,
    incomeLowerBound: Number(record.incomeLowerBound),
    incomeUpperBound:
      record.incomeUpperBound !== null ? Number(record.incomeUpperBound) : undefined,
    rate: Number(record.rate),
    effectiveStartDate: dayjs(record.effectiveStartDate),
    effectiveEndDate: record.effectiveEndDate ? dayjs(record.effectiveEndDate) : null,
  };
}

export function runtimeFormValuesToApi(
  values: TerBracketMasterFormRuntimeValues,
): TerBracketMasterFormValues {
  return {
    terCategory: values.terCategory,
    incomeLowerBound: String(values.incomeLowerBound),
    incomeUpperBound:
      values.incomeUpperBound !== undefined ? String(values.incomeUpperBound) : undefined,
    rate: String(values.rate),
    effectiveStartDate: values.effectiveStartDate.format('YYYY-MM-DD'),
    effectiveEndDate: values.effectiveEndDate
      ? values.effectiveEndDate.format('YYYY-MM-DD')
      : undefined,
    reason: values.reason || undefined,
  };
}
