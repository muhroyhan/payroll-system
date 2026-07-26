import dayjs, { type Dayjs } from 'dayjs';
import type { ScopeType } from '@payroll-system/shared-types';
import type { LeavePolicyMaster, LeavePolicyMasterFormValues } from './api';

export interface LeavePolicyMasterFormRuntimeValues {
  leaveTypeId: string;
  scopeType: ScopeType;
  scopeValue: string;
  annualQuota: number;
  effectiveStartDate: Dayjs;
  effectiveEndDate?: Dayjs | null;
  reason?: string;
}

export function leavePolicyMasterToRuntimeFormValues(
  record: LeavePolicyMaster,
): LeavePolicyMasterFormRuntimeValues {
  return {
    leaveTypeId: record.leaveTypeId,
    scopeType: record.scopeType,
    scopeValue: record.scopeValue,
    annualQuota: record.annualQuota,
    effectiveStartDate: dayjs(record.effectiveStartDate),
    effectiveEndDate: record.effectiveEndDate ? dayjs(record.effectiveEndDate) : null,
  };
}

export function runtimeFormValuesToApi(
  values: LeavePolicyMasterFormRuntimeValues,
): LeavePolicyMasterFormValues {
  return {
    leaveTypeId: values.leaveTypeId,
    scopeType: values.scopeType,
    scopeValue: values.scopeValue,
    annualQuota: values.annualQuota,
    effectiveStartDate: values.effectiveStartDate.format('YYYY-MM-DD'),
    effectiveEndDate: values.effectiveEndDate
      ? values.effectiveEndDate.format('YYYY-MM-DD')
      : undefined,
    reason: values.reason || undefined,
  };
}
