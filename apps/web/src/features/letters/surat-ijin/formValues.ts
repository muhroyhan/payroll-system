import dayjs, { type Dayjs } from 'dayjs';
import type { SuratIjinType } from '@payroll-system/shared-types';
import type { SuratIjin, SuratIjinFormValues } from './api';

// timeRequested is a plain "HH:mm" string on the wire (CreateSuratIjinDto's
// @IsString, no strict format enforced server-side) — TimePicker needs Dayjs.
export interface SuratIjinFormRuntimeValues {
  employeeId: string;
  date: Dayjs;
  type: SuratIjinType;
  reason: string;
  timeRequested: Dayjs;
}

export function suratIjinToRuntimeFormValues(record: SuratIjin): SuratIjinFormRuntimeValues {
  return {
    employeeId: record.employeeId,
    date: dayjs(record.date),
    type: record.type,
    reason: record.reason,
    timeRequested: dayjs(record.timeRequested, 'HH:mm'),
  };
}

export function runtimeFormValuesToApi(values: SuratIjinFormRuntimeValues): SuratIjinFormValues {
  return {
    employeeId: values.employeeId,
    date: values.date.format('YYYY-MM-DD'),
    type: values.type,
    reason: values.reason,
    timeRequested: values.timeRequested.format('HH:mm'),
  };
}
