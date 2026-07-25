import type { TerCategory } from '@payroll-system/shared-types';
import { apiClient } from '../../../api/client';

// Mirrors ter-bracket-master.entity.ts. Admin-only, no scope fields,
// effective-dated, no DELETE — same shape as ptkp-master (verified
// separately against ter-bracket-master.controller.ts).
//
// `rate` is a fraction (e.g. "0.05000" = 5%) — displayed exactly as
// returned, never multiplied/converted client-side (R-07).
export interface TerBracketMaster {
  id: string;
  terCategory: TerCategory;
  incomeLowerBound: string;
  /** null = highest bracket, no upper bound. */
  incomeUpperBound: string | null;
  rate: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdBy: string;
}

export interface TerBracketMasterFormValues {
  terCategory: TerCategory;
  incomeLowerBound: string;
  incomeUpperBound?: string;
  rate: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
}

export async function listTerBracketMasters(): Promise<TerBracketMaster[]> {
  const { data } = await apiClient.get<TerBracketMaster[]>(
    '/tax-bpjs-constants/ter-bracket-master',
  );
  return data;
}

export async function createTerBracketMaster(
  input: TerBracketMasterFormValues,
): Promise<TerBracketMaster> {
  const { data } = await apiClient.post<TerBracketMaster>(
    '/tax-bpjs-constants/ter-bracket-master',
    input,
  );
  return data;
}

export async function updateTerBracketMaster(
  id: string,
  input: Partial<TerBracketMasterFormValues>,
): Promise<TerBracketMaster> {
  const { data } = await apiClient.put<TerBracketMaster>(
    `/tax-bpjs-constants/ter-bracket-master/${id}`,
    input,
  );
  return data;
}

// Brackets active for `asOf`, optionally narrowed to one category — an
// array (possibly several brackets within one category), never a single
// picked winner (verified against ter-bracket-master.service.ts).
export async function resolveEffectiveTerBrackets(
  asOf?: string,
  category?: TerCategory,
): Promise<TerBracketMaster[]> {
  const { data } = await apiClient.get<TerBracketMaster[]>(
    '/tax-bpjs-constants/ter-bracket-master/effective',
    { params: { asOf, category } },
  );
  return data;
}
