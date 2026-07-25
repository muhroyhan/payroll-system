import dayjs, { type Dayjs } from 'dayjs';
import type { LeaveRequest, LeaveRequestFormValues } from './api';

export interface LeaveRequestFormRuntimeValues {
  employeeId: string;
  leaveTypeId: string;
  startDate: Dayjs;
  endDate: Dayjs;
}

export function leaveRequestToRuntimeFormValues(
  record: LeaveRequest,
): LeaveRequestFormRuntimeValues {
  return {
    employeeId: record.employeeId,
    leaveTypeId: record.leaveTypeId,
    startDate: dayjs(record.startDate),
    endDate: dayjs(record.endDate),
  };
}

export function runtimeFormValuesToApi(
  values: LeaveRequestFormRuntimeValues,
): LeaveRequestFormValues {
  return {
    employeeId: values.employeeId,
    leaveTypeId: values.leaveTypeId,
    startDate: values.startDate.format('YYYY-MM-DD'),
    endDate: values.endDate.format('YYYY-MM-DD'),
  };
}
