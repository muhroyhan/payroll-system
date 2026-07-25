import { apiClient } from '../../api/client';
import type { OrgMasterRecord } from '../organization/api';

// Mirrors apps/api/src/modules/fingerprints/entities/fingerprint.entity.ts.
// list()/findOne() both include ['employee'] (verified against
// fingerprints.service.ts).
export interface Fingerprint {
  id: string;
  employeeId: string;
  employee?: OrgMasterRecord;
  deviceUserId: string;
  deviceId: string;
  enrolledAt: string;
}

export interface FingerprintFormValues {
  employeeId: string;
  deviceUserId: string;
  deviceId: string;
  enrolledAt?: string;
}

export async function listFingerprints(): Promise<Fingerprint[]> {
  const { data } = await apiClient.get<Fingerprint[]>('/fingerprints');
  return data;
}

export async function createFingerprint(
  input: FingerprintFormValues,
): Promise<Fingerprint> {
  const { data } = await apiClient.post<Fingerprint>('/fingerprints', input);
  return data;
}

export async function updateFingerprint(
  id: string,
  input: Partial<FingerprintFormValues>,
): Promise<Fingerprint> {
  const { data } = await apiClient.put<Fingerprint>(`/fingerprints/${id}`, input);
  return data;
}

export async function removeFingerprint(id: string): Promise<void> {
  await apiClient.delete(`/fingerprints/${id}`);
}
