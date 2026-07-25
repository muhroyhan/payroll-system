import { apiClient } from '../../../api/client';

// Mirrors bpjs-ketenagakerjaan-master.entity.ts. Admin-only, no scope
// fields, effective-dated, no DELETE (verified against
// bpjs-ketenagakerjaan-master.controller.ts). One "rate card" row bundles
// JHT/JP/JKK/JKM together — JKP is intentionally not modeled (government/
// JKK-JKM funded, no payroll deduction, per the entity's own comment).
export interface BpjsKetenagakerjaanMaster {
  id: string;
  jhtEmployeeRate: string;
  jhtCompanyRate: string;
  jpEmployeeRate: string;
  jpCompanyRate: string;
  jpWageCap: string;
  jkkCompanyRate: string;
  jkmCompanyRate: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdBy: string;
}

export interface BpjsKetenagakerjaanMasterFormValues {
  jhtEmployeeRate: string;
  jhtCompanyRate: string;
  jpEmployeeRate: string;
  jpCompanyRate: string;
  jpWageCap: string;
  jkkCompanyRate: string;
  jkmCompanyRate: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
}

export async function listBpjsKetenagakerjaanMasters(): Promise<BpjsKetenagakerjaanMaster[]> {
  const { data } = await apiClient.get<BpjsKetenagakerjaanMaster[]>(
    '/tax-bpjs-constants/bpjs-ketenagakerjaan-master',
  );
  return data;
}

export async function createBpjsKetenagakerjaanMaster(
  input: BpjsKetenagakerjaanMasterFormValues,
): Promise<BpjsKetenagakerjaanMaster> {
  const { data } = await apiClient.post<BpjsKetenagakerjaanMaster>(
    '/tax-bpjs-constants/bpjs-ketenagakerjaan-master',
    input,
  );
  return data;
}

export async function updateBpjsKetenagakerjaanMaster(
  id: string,
  input: Partial<BpjsKetenagakerjaanMasterFormValues>,
): Promise<BpjsKetenagakerjaanMaster> {
  const { data } = await apiClient.put<BpjsKetenagakerjaanMaster>(
    `/tax-bpjs-constants/bpjs-ketenagakerjaan-master/${id}`,
    input,
  );
  return data;
}

// Single-object resolve, 404 if none configured — same shape as BPJS
// Kesehatan, verified against bpjs-ketenagakerjaan-master.service.ts.
export async function resolveEffectiveBpjsKetenagakerjaan(
  asOf?: string,
): Promise<BpjsKetenagakerjaanMaster> {
  const { data } = await apiClient.get<BpjsKetenagakerjaanMaster>(
    '/tax-bpjs-constants/bpjs-ketenagakerjaan-master/effective',
    { params: { asOf } },
  );
  return data;
}
