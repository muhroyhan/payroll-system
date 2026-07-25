import type { PayslipComponentType } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';

// Mirrors payslip-component.entity.ts.
//
// ⚠️ GET/POST/PUT /payslip-components are all admin-only
// (@Roles(Role.ADMIN) at the class level, no A+H override — verified
// against payslip-components.controller.ts). surat-peringatan's optional
// sanction field (FE-T19) and payslip-temp-components' required componentId
// (FE-T23) both degrade gracefully for HR staff instead of showing a broken
// Select — see those features' FormFields components.
//
// ⚠️ There is NO delete endpoint (§11 — never hard-deleted; "retiring" means
// ceasing to reference it, nothing to build here).
//
// ✅ RESOLVED — componentType/isTaxable/isBpjsEligible are genuinely
// immutable once this component is referenced by a payslip_line_items row
// (payslip-components.service.ts's assertMutableFieldsUntouched, added
// after this gap was found and confirmed live via curl: an update that used
// to return 200 on a referenced component now returns 409). Still not
// derivable from this response (no isLocked flag) — R-06b applies: the form
// doesn't pre-emptively disable anything, it submits as-is and
// FormDrawer's built-in conflict handling shows the real 409 as a
// persistent modal. `name` is never locked.
export interface PayslipComponent {
  id: string;
  name: string;
  componentType: PayslipComponentType;
  isTaxable: boolean;
  isBpjsEligible: boolean;
}

export interface PayslipComponentFormValues {
  name: string;
  componentType: PayslipComponentType;
  isTaxable: boolean;
  isBpjsEligible: boolean;
}

export async function listPayslipComponents(): Promise<PayslipComponent[]> {
  const { data } = await apiClient.get<PayslipComponent[]>('/payslip-components');
  return data;
}

export async function createPayslipComponent(
  input: PayslipComponentFormValues,
): Promise<PayslipComponent> {
  const { data } = await apiClient.post<PayslipComponent>('/payslip-components', input);
  return data;
}

export async function updatePayslipComponent(
  id: string,
  input: Partial<PayslipComponentFormValues>,
): Promise<PayslipComponent> {
  const { data } = await apiClient.put<PayslipComponent>(`/payslip-components/${id}`, input);
  return data;
}
