import type { PtkpStatus } from '@payroll-system/shared-types';
import { apiClient } from '../../../api/client';

// Mirrors ptkp-master.entity.ts. Admin-only (@Roles(Role.ADMIN), no A+H
// override — verified against ptkp-master.controller.ts). No scope fields
// at all (this is per-PtkpStatus, not per-employee/division/etc.) — no
// ScopeSelector here, unlike salary/incentive master (FE-T09/T10).
// Effective-dated (has effectiveStartDate/effectiveEndDate) — genuinely
// verified, not assumed — so EffectiveDatedMasterPage applies. No DELETE
// endpoint (§11).
export interface PtkpMaster {
  id: string;
  ptkpStatus: PtkpStatus;
  amount: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdBy: string;
  updatedBy: string | null;
  reason: string | null;
  supersedesId: string | null;
}

export interface PtkpMasterFormValues {
  ptkpStatus: PtkpStatus;
  amount: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  reason?: string;
}

export async function listPtkpMasters(): Promise<PtkpMaster[]> {
  const { data } = await apiClient.get<PtkpMaster[]>('/tax-bpjs-constants/ptkp-master');
  return data;
}

export async function createPtkpMaster(input: PtkpMasterFormValues): Promise<PtkpMaster> {
  const { data } = await apiClient.post<PtkpMaster>('/tax-bpjs-constants/ptkp-master', input);
  return data;
}

export async function updatePtkpMaster(
  id: string,
  input: Partial<PtkpMasterFormValues>,
): Promise<PtkpMaster> {
  const { data } = await apiClient.put<PtkpMaster>(
    `/tax-bpjs-constants/ptkp-master/${id}`,
    input,
  );
  return data;
}

// Returns every PTKP status row active for `asOf` (one per status that has
// a currently-effective rule) — an array, not a single winner (verified
// against ptkp-master.service.ts's resolveEffective).
export async function resolveEffectivePtkp(asOf?: string): Promise<PtkpMaster[]> {
  const { data } = await apiClient.get<PtkpMaster[]>(
    '/tax-bpjs-constants/ptkp-master/effective',
    { params: { asOf } },
  );
  return data;
}
