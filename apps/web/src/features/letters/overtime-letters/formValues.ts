import dayjs, { type Dayjs } from 'dayjs';
import type { OvertimeLetter, OvertimeLetterFormValues } from './api';

// plannedOvertimeHours/actualOvertimeHours are @IsNumberString on the wire
// (decimal strings) — plain numbers in the runtime form for InputNumber.
export interface OvertimeLetterFormRuntimeValues {
  employeeId: string;
  date: Dayjs;
  plannedOvertimeHours: number;
  actualOvertimeHours: number;
  reason: string;
}

export function overtimeLetterToRuntimeFormValues(
  record: OvertimeLetter,
): OvertimeLetterFormRuntimeValues {
  return {
    employeeId: record.employeeId,
    date: dayjs(record.date),
    plannedOvertimeHours: Number(record.plannedOvertimeHours),
    actualOvertimeHours: Number(record.actualOvertimeHours),
    reason: record.reason,
  };
}

export function runtimeFormValuesToApi(
  values: OvertimeLetterFormRuntimeValues,
): OvertimeLetterFormValues {
  return {
    employeeId: values.employeeId,
    date: values.date.format('YYYY-MM-DD'),
    plannedOvertimeHours: String(values.plannedOvertimeHours),
    actualOvertimeHours: String(values.actualOvertimeHours),
    reason: values.reason,
  };
}
