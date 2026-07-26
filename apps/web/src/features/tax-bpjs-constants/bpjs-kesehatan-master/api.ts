import { apiClient } from '../../../api/client';

// Mirrors bpjs-kesehatan-master.entity.ts. Admin-only, no scope fields,
// effective-dated, no DELETE (verified against
// bpjs-kesehatan-master.controller.ts).
export interface BpjsKesehatanMaster {
  id: string;
  employeeRate: string;
  companyRate: string;
  wageCap: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdBy: string;
  updatedBy: string | null;
  reason: string | null;
  supersedesId: string | null;
}

export interface BpjsKesehatanMasterFormValues {
  employeeRate: string;
  companyRate: string;
  wageCap: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  reason?: string;
}

export async function listBpjsKesehatanMasters(): Promise<BpjsKesehatanMaster[]> {
  const { data } = await apiClient.get<BpjsKesehatanMaster[]>(
    '/tax-bpjs-constants/bpjs-kesehatan-master',
  );
  return data;
}

export async function createBpjsKesehatanMaster(
  input: BpjsKesehatanMasterFormValues,
): Promise<BpjsKesehatanMaster> {
  const { data } = await apiClient.post<BpjsKesehatanMaster>(
    '/tax-bpjs-constants/bpjs-kesehatan-master',
    input,
  );
  return data;
}

export async function updateBpjsKesehatanMaster(
  id: string,
  input: Partial<BpjsKesehatanMasterFormValues>,
): Promise<BpjsKesehatanMaster> {
  const { data } = await apiClient.put<BpjsKesehatanMaster>(
    `/tax-bpjs-constants/bpjs-kesehatan-master/${id}`,
    input,
  );
  return data;
}

// UNLIKE ptkp/ter (which return arrays), this resolves to exactly ONE row —
// verified against bpjs-kesehatan-master.service.ts, which 404s
// (NotFoundException) if none is configured for the period, rather than
// returning an empty array. Callers must handle that 404 as a real,
// expected state (see BpjsKesehatanEffectivePreview.tsx), not an error.
export async function resolveEffectiveBpjsKesehatan(
  asOf?: string,
): Promise<BpjsKesehatanMaster> {
  const { data } = await apiClient.get<BpjsKesehatanMaster>(
    '/tax-bpjs-constants/bpjs-kesehatan-master/effective',
    { params: { asOf } },
  );
  return data;
}
