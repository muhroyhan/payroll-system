import dayjs, { type Dayjs } from 'dayjs';
import type { Kasbon, KasbonFormValues } from './api';

export interface KasbonFormRuntimeValues {
  employeeId: string;
  amount: number;
  requestDate: Dayjs;
  installmentCount: number;
}

export function kasbonToRuntimeFormValues(record: Kasbon): KasbonFormRuntimeValues {
  return {
    employeeId: record.employeeId,
    amount: Number(record.amount),
    requestDate: dayjs(record.requestDate),
    installmentCount: record.installmentCount,
  };
}

export function runtimeFormValuesToApi(values: KasbonFormRuntimeValues): KasbonFormValues {
  return {
    employeeId: values.employeeId,
    amount: String(values.amount),
    requestDate: values.requestDate.format('YYYY-MM-DD'),
    installmentCount: values.installmentCount,
  };
}
