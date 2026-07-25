import dayjs, { type Dayjs } from 'dayjs';
import type { ScopeType } from '@payroll-system/shared-types';
import type { IncentiveMaster, IncentiveMasterFormValues } from './api';

export interface IncentiveMasterFormRuntimeValues {
  scopeType: ScopeType;
  scopeValue: string;
  incentiveAmount: number;
  isBpjsEligible: boolean;
  effectiveStartDate: Dayjs;
  effectiveEndDate?: Dayjs | null;
}

export function incentiveMasterToRuntimeFormValues(
  record: IncentiveMaster,
): IncentiveMasterFormRuntimeValues {
  return {
    scopeType: record.scopeType,
    scopeValue: record.scopeValue,
    incentiveAmount: Number(record.incentiveAmount),
    isBpjsEligible: record.isBpjsEligible,
    effectiveStartDate: dayjs(record.effectiveStartDate),
    effectiveEndDate: record.effectiveEndDate ? dayjs(record.effectiveEndDate) : null,
  };
}

export function runtimeFormValuesToApi(
  values: IncentiveMasterFormRuntimeValues,
): IncentiveMasterFormValues {
  return {
    scopeType: values.scopeType,
    scopeValue: values.scopeValue,
    incentiveAmount: String(values.incentiveAmount),
    isBpjsEligible: values.isBpjsEligible,
    effectiveStartDate: values.effectiveStartDate.format('YYYY-MM-DD'),
    effectiveEndDate: values.effectiveEndDate
      ? values.effectiveEndDate.format('YYYY-MM-DD')
      : undefined,
  };
}
