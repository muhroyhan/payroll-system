import dayjs, { type Dayjs } from 'dayjs';
import type { Holiday, HolidayFormValues } from './api';

export interface HolidayFormRuntimeValues {
  date: Dayjs;
  name: string;
  isActive?: boolean;
}

export function holidayToRuntimeFormValues(holiday: Holiday): HolidayFormRuntimeValues {
  return { date: dayjs(holiday.date), name: holiday.name, isActive: holiday.isActive };
}

export function runtimeFormValuesToApi(values: HolidayFormRuntimeValues): HolidayFormValues {
  return { name: values.name, isActive: values.isActive, date: values.date.format('YYYY-MM-DD') };
}
