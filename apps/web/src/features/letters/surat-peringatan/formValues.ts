import dayjs, { type Dayjs } from 'dayjs';
import type { SPLevel } from '@payroll-system/shared-types';
import type { SuratPeringatan, SuratPeringatanFormValues } from './api';

export interface SuratPeringatanFormRuntimeValues {
  employeeId: string;
  level: SPLevel;
  violationDescription: string;
  issueDate: Dayjs;
  sanctionComponentId?: string;
  sanctionAmount?: number;
}

export function suratPeringatanToRuntimeFormValues(
  record: SuratPeringatan,
): SuratPeringatanFormRuntimeValues {
  return {
    employeeId: record.employeeId,
    level: record.level,
    violationDescription: record.violationDescription,
    issueDate: dayjs(record.issueDate),
    sanctionComponentId: record.sanctionComponentId ?? undefined,
    sanctionAmount: record.sanctionAmount ? Number(record.sanctionAmount) : undefined,
  };
}

// `issuedBy` is deliberately NOT part of the runtime form — it's the current
// logged-in user, filled in by the caller (SuratPeringatanFormDrawer.tsx),
// never a field HR picks (CreateSuratPeringatanDto has no @CurrentUser()
// equivalent server-side; the client must supply it, so it must be the
// actual submitter, not a free-choice field).
export function runtimeFormValuesToApi(
  values: SuratPeringatanFormRuntimeValues,
  issuedBy: string,
): SuratPeringatanFormValues {
  return {
    employeeId: values.employeeId,
    level: values.level,
    violationDescription: values.violationDescription,
    issueDate: values.issueDate.format('YYYY-MM-DD'),
    sanctionComponentId: values.sanctionComponentId,
    sanctionAmount:
      values.sanctionAmount !== undefined ? String(values.sanctionAmount) : undefined,
    issuedBy,
  };
}
