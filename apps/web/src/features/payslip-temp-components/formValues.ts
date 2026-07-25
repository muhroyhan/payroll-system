import type { ScopeType } from '@payroll-system/shared-types';
import type { PayslipTempComponent, PayslipTempComponentFormValues } from './api';

// amount is @IsNumberString on the wire — a plain number in the runtime
// form (InputNumber), same seam as salary/incentive master (FE-T09/T10).
export interface PayslipTempComponentFormRuntimeValues {
  componentId: string;
  scopeType: ScopeType;
  scopeValue: string;
  amount: number;
  periodYear: number;
  periodMonth: number;
}

export function tempComponentToRuntimeFormValues(
  record: PayslipTempComponent,
): PayslipTempComponentFormRuntimeValues {
  return {
    componentId: record.componentId,
    scopeType: record.scopeType,
    scopeValue: record.scopeValue,
    amount: Number(record.amount),
    periodYear: record.periodYear,
    periodMonth: record.periodMonth,
  };
}

export function runtimeFormValuesToApi(
  values: PayslipTempComponentFormRuntimeValues,
): PayslipTempComponentFormValues {
  return {
    componentId: values.componentId,
    scopeType: values.scopeType,
    scopeValue: values.scopeValue,
    amount: String(values.amount),
    periodYear: values.periodYear,
    periodMonth: values.periodMonth,
  };
}
