import type { SPLevel } from '@payroll-system/shared-types';
import { apiClient } from '../../../api/client';
import type { OrgMasterRecord } from '../../organization/api';
import type { PayslipComponent } from '../../payslip-components/api';

// Mirrors surat-peringatan.entity.ts. list()/findOne() include
// ['employee', 'sanctionComponent'] (verified against
// surat-peringatan.service.ts).
//
// ⚠️ Unlike surat_ijin/overtime_letter, this entity has NO pending/approved
// workflow at all — §5.5 documents no such status for it, and
// surat-peringatan.controller.ts exposes no /approve or /reject route. It is
// issued the moment it's created. Do not build approve/reject UI for this
// screen — there is nothing to call.
export interface SuratPeringatan {
  id: string;
  employeeId: string;
  employee?: OrgMasterRecord;
  level: SPLevel;
  violationDescription: string;
  issueDate: string;
  sanctionComponentId: string | null;
  sanctionComponent?: PayslipComponent | null;
  sanctionAmount: string | null;
  issuedBy: string;
  pdfPath: string | null;
}

export interface SuratPeringatanFormValues {
  employeeId: string;
  level: SPLevel;
  violationDescription: string;
  issueDate: string;
  sanctionComponentId?: string;
  sanctionAmount?: string;
  issuedBy: string;
}

export async function listSuratPeringatan(employeeId?: string): Promise<SuratPeringatan[]> {
  const { data } = await apiClient.get<SuratPeringatan[]>('/surat-peringatan', {
    params: { employeeId },
  });
  return data;
}

export async function getSuratPeringatan(id: string): Promise<SuratPeringatan> {
  const { data } = await apiClient.get<SuratPeringatan>(`/surat-peringatan/${id}`);
  return data;
}

export async function createSuratPeringatan(
  input: SuratPeringatanFormValues,
): Promise<SuratPeringatan> {
  const { data } = await apiClient.post<SuratPeringatan>('/surat-peringatan', input);
  return data;
}

// §11 — locked once the sanction has been pulled into a payslip line item.
// NOT derivable from this response (no isLocked flag exists, §13.5 B-06) —
// R-06b: submit as-is, let the 409 (if any) surface via describeApiError().
export async function updateSuratPeringatan(
  id: string,
  input: Partial<SuratPeringatanFormValues>,
): Promise<SuratPeringatan> {
  const { data } = await apiClient.put<SuratPeringatan>(`/surat-peringatan/${id}`, input);
  return data;
}

export async function removeSuratPeringatan(id: string): Promise<void> {
  await apiClient.delete(`/surat-peringatan/${id}`);
}
