import dayjs, { type Dayjs } from 'dayjs';
import type { BpjsKetenagakerjaanMaster, BpjsKetenagakerjaanMasterFormValues } from './api';

export interface BpjsKetenagakerjaanMasterFormRuntimeValues {
  jhtEmployeeRate: number;
  jhtCompanyRate: number;
  jpEmployeeRate: number;
  jpCompanyRate: number;
  jpWageCap: number;
  jkkCompanyRate: number;
  jkmCompanyRate: number;
  effectiveStartDate: Dayjs;
  effectiveEndDate?: Dayjs | null;
}

export function bpjsKetenagakerjaanMasterToRuntimeFormValues(
  record: BpjsKetenagakerjaanMaster,
): BpjsKetenagakerjaanMasterFormRuntimeValues {
  return {
    jhtEmployeeRate: Number(record.jhtEmployeeRate),
    jhtCompanyRate: Number(record.jhtCompanyRate),
    jpEmployeeRate: Number(record.jpEmployeeRate),
    jpCompanyRate: Number(record.jpCompanyRate),
    jpWageCap: Number(record.jpWageCap),
    jkkCompanyRate: Number(record.jkkCompanyRate),
    jkmCompanyRate: Number(record.jkmCompanyRate),
    effectiveStartDate: dayjs(record.effectiveStartDate),
    effectiveEndDate: record.effectiveEndDate ? dayjs(record.effectiveEndDate) : null,
  };
}

export function runtimeFormValuesToApi(
  values: BpjsKetenagakerjaanMasterFormRuntimeValues,
): BpjsKetenagakerjaanMasterFormValues {
  return {
    jhtEmployeeRate: String(values.jhtEmployeeRate),
    jhtCompanyRate: String(values.jhtCompanyRate),
    jpEmployeeRate: String(values.jpEmployeeRate),
    jpCompanyRate: String(values.jpCompanyRate),
    jpWageCap: String(values.jpWageCap),
    jkkCompanyRate: String(values.jkkCompanyRate),
    jkmCompanyRate: String(values.jkmCompanyRate),
    effectiveStartDate: values.effectiveStartDate.format('YYYY-MM-DD'),
    effectiveEndDate: values.effectiveEndDate
      ? values.effectiveEndDate.format('YYYY-MM-DD')
      : undefined,
  };
}
