import type { OvertimeLetterStatus } from '@payroll-system/shared-types';
import { apiClient } from '../../../api/client';
import type { OrgMasterRecord } from '../../organization/api';

// Mirrors overtime-letter.entity.ts. list()/findOne() include ['employee']
// (verified against overtime-letters.service.ts).
//
// ⚠️ Two INDEPENDENT locks (§15.10 C): (a) verify()/reject() are gated by
// `status !== 'pending'` — fully derivable, R-06a; (b) update()/remove() are
// gated by a payslip-reference check that is completely separate from
// status — a `verified` letter stays editable until its hours are actually
// pulled into a payslip line item. That second lock has no flag on this
// response (§13.5 B-06) — R-06b applies to Edit/Delete specifically, not to
// Verify/Reject.
export interface OvertimeLetter {
  id: string;
  employeeId: string;
  employee?: OrgMasterRecord;
  date: string;
  plannedOvertimeHours: string;
  actualOvertimeHours: string;
  reason: string;
  status: OvertimeLetterStatus;
  verifiedBy: string | null;
  pdfPath: string | null;
}

export interface OvertimeLetterFormValues {
  employeeId: string;
  date: string;
  plannedOvertimeHours: string;
  actualOvertimeHours: string;
  reason: string;
}

export async function listOvertimeLetters(employeeId?: string): Promise<OvertimeLetter[]> {
  const { data } = await apiClient.get<OvertimeLetter[]>('/overtime-letters', {
    params: { employeeId },
  });
  return data;
}

export async function getOvertimeLetter(id: string): Promise<OvertimeLetter> {
  const { data } = await apiClient.get<OvertimeLetter>(`/overtime-letters/${id}`);
  return data;
}

export async function createOvertimeLetter(
  input: OvertimeLetterFormValues,
): Promise<OvertimeLetter> {
  const { data } = await apiClient.post<OvertimeLetter>('/overtime-letters', input);
  return data;
}

export async function updateOvertimeLetter(
  id: string,
  input: Partial<OvertimeLetterFormValues>,
): Promise<OvertimeLetter> {
  const { data } = await apiClient.put<OvertimeLetter>(`/overtime-letters/${id}`, input);
  return data;
}

export async function removeOvertimeLetter(id: string): Promise<void> {
  await apiClient.delete(`/overtime-letters/${id}`);
}

export async function verifyOvertimeLetter(id: string): Promise<OvertimeLetter> {
  const { data } = await apiClient.put<OvertimeLetter>(`/overtime-letters/${id}/verify`);
  return data;
}

export async function rejectOvertimeLetter(id: string): Promise<OvertimeLetter> {
  const { data } = await apiClient.put<OvertimeLetter>(`/overtime-letters/${id}/reject`);
  return data;
}
