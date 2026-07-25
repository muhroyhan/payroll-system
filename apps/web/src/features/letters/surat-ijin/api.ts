import type { SuratIjinStatus, SuratIjinType } from '@payroll-system/shared-types';
import { apiClient } from '../../../api/client';
import type { OrgMasterRecord } from '../../organization/api';

// Mirrors surat-ijin.entity.ts. list()/findOne() both include ['employee']
// (verified against surat-ijin.service.ts).
export interface SuratIjin {
  id: string;
  employeeId: string;
  employee?: OrgMasterRecord;
  date: string;
  type: SuratIjinType;
  reason: string;
  timeRequested: string;
  status: SuratIjinStatus;
  approvedBy: string | null;
  // Populated asynchronously once approved — null means "not generated yet",
  // not an error (§15.10). Derivable, so the download action can be
  // pre-emptively disabled instead of waiting for the PDF 404 (R-06a).
  pdfPath: string | null;
}

export interface SuratIjinFormValues {
  employeeId: string;
  date: string;
  type: SuratIjinType;
  reason: string;
  timeRequested: string;
}

export async function listSuratIjin(employeeId?: string): Promise<SuratIjin[]> {
  const { data } = await apiClient.get<SuratIjin[]>('/surat-ijin', { params: { employeeId } });
  return data;
}

export async function getSuratIjin(id: string): Promise<SuratIjin> {
  const { data } = await apiClient.get<SuratIjin>(`/surat-ijin/${id}`);
  return data;
}

export async function createSuratIjin(input: SuratIjinFormValues): Promise<SuratIjin> {
  const { data } = await apiClient.post<SuratIjin>('/surat-ijin', input);
  return data;
}

export async function updateSuratIjin(
  id: string,
  input: Partial<SuratIjinFormValues>,
): Promise<SuratIjin> {
  const { data } = await apiClient.put<SuratIjin>(`/surat-ijin/${id}`, input);
  return data;
}

export async function removeSuratIjin(id: string): Promise<void> {
  await apiClient.delete(`/surat-ijin/${id}`);
}

export async function approveSuratIjin(id: string): Promise<SuratIjin> {
  const { data } = await apiClient.put<SuratIjin>(`/surat-ijin/${id}/approve`);
  return data;
}

export async function rejectSuratIjin(id: string): Promise<SuratIjin> {
  const { data } = await apiClient.put<SuratIjin>(`/surat-ijin/${id}/reject`);
  return data;
}
