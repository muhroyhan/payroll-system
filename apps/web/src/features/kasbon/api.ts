import type { KasbonStatus } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';
import type { PaginatedResult, PaginationParams } from '../../api/pagination';
import type { OrgMasterRecord } from '../organization/api';

// Mirrors kasbon.entity.ts. list()/findOne() include ['employee'] (verified
// against kasbon.service.ts).
//
// ⚠️ remainingBalance is null until approved (set to `amount` at approval
// time, KasbonService.approve()) — it is NOT "0 means paid off, null means
// error"; null specifically means "not approved yet, nothing has been fixed
// in place." All three locks below are fully derivable from these three
// fields — no payslip-reference-style invisible lock here (unlike
// surat_peringatan/overtime_letter, FE-T19/T20):
//   1. status === 'rejected' | 'paid_off' → dead end, no edit/delete at all.
//   2. status === 'approved' AND remainingBalance < amount (a deduction has
//      started) → only amount/installmentCount frozen (installmentAmount is
//      derived from those two, BUGS#20 — nothing separate left to lock);
//      requestDate stays editable. Delete is fully blocked in this state too
//      (KasbonService.remove has no partial-delete concept).
//   3. status === 'pending' (or 'approved' with no deduction yet) → fully
//      editable.
export interface Kasbon {
  id: string;
  employeeId: string;
  employee?: OrgMasterRecord;
  amount: string;
  requestDate: string;
  installmentCount: number;
  installmentAmount: string;
  remainingBalance: string | null;
  status: KasbonStatus;
  approvedBy: string | null;
  // BUGS#19 -- eager-loaded (id/name only) by the backend.
  approvedByUser?: { id: string; name: string } | null;
  rejectedBy: string | null;
  rejectedByUser?: { id: string; name: string } | null;
  rejectReason: string | null;
  createdBy: string | null;
  createdByUser?: { id: string; name: string } | null;
}

// BUGS#20 — installmentAmount is server-derived (floor(amount /
// installmentCount), remainder absorbed by the last installment at
// deduction time); it's never part of what the client submits.
export interface KasbonFormValues {
  employeeId: string;
  amount: string;
  requestDate: string;
  installmentCount: number;
}

export function hasDeductionStarted(record: Kasbon): boolean {
  return record.remainingBalance !== null && Number(record.remainingBalance) < Number(record.amount);
}

export async function listKasbon(employeeId?: string): Promise<Kasbon[]> {
  const { data } = await apiClient.get<Kasbon[]>('/kasbon', { params: { employeeId } });
  return data;
}

// BUGS#2 — GET /kasbon WITH page/limit gets the paginated {items,total,...}
// shape back (KasbonService.list()'s doc comment); listKasbon() above (no
// page/limit) stays unpaginated for HomePage's dashboard widget.
export async function listKasbonPaginated(
  params: PaginationParams & { employeeId?: string },
): Promise<PaginatedResult<Kasbon>> {
  const { data } = await apiClient.get<PaginatedResult<Kasbon>>('/kasbon', { params });
  return data;
}

export async function getKasbon(id: string): Promise<Kasbon> {
  const { data } = await apiClient.get<Kasbon>(`/kasbon/${id}`);
  return data;
}

export async function createKasbon(input: KasbonFormValues): Promise<Kasbon> {
  const { data } = await apiClient.post<Kasbon>('/kasbon', input);
  return data;
}

export async function updateKasbon(
  id: string,
  input: Partial<KasbonFormValues>,
): Promise<Kasbon> {
  const { data } = await apiClient.put<Kasbon>(`/kasbon/${id}`, input);
  return data;
}

export async function removeKasbon(id: string): Promise<void> {
  await apiClient.delete(`/kasbon/${id}`);
}

export async function approveKasbon(id: string): Promise<Kasbon> {
  const { data } = await apiClient.put<Kasbon>(`/kasbon/${id}/approve`);
  return data;
}

export async function rejectKasbon(id: string, reason: string): Promise<Kasbon> {
  const { data } = await apiClient.put<Kasbon>(`/kasbon/${id}/reject`, { reason });
  return data;
}
