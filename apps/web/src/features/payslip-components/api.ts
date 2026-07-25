import type { PayslipComponentType } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';

// Mirrors payslip-component.entity.ts. Full CRUD screen (admin-only, §15.6)
// is FE-T22 — this read-only slice is pulled forward because
// surat-peringatan's optional sanction field (FE-T19) needs the component
// list to pick from.
//
// ⚠️ GET /payslip-components is admin-only (@Roles(Role.ADMIN) at the class
// level, no A+H override — verified against payslip-components.controller.ts).
// An HR user's request 403s. surat-peringatan is A+H, so the sanction
// section must degrade gracefully for HR staff rather than showing a broken
// Select — see SuratPeringatanFormFields.tsx.
export interface PayslipComponent {
  id: string;
  name: string;
  componentType: PayslipComponentType;
  isTaxable: boolean;
  isBpjsEligible: boolean;
}

export async function listPayslipComponents(): Promise<PayslipComponent[]> {
  const { data } = await apiClient.get<PayslipComponent[]>('/payslip-components');
  return data;
}
