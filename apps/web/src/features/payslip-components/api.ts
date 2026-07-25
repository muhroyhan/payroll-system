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
// ⚠️ The entity's own comment claims componentType/isTaxable/isBpjsEligible
// "become immutable" once referenced by a payslip_line_items row, citing
// P8-T07 — but payslip-components.service.ts's update() has NO such guard;
// it unconditionally applies the patch. This is a real gap between the
// documented intent and the shipped backend code, not something to route
// around: the UI cannot pre-emptively disable a lock the server doesn't
// enforce (that would be R-06a for a rule that isn't real), and there is no
// 409 to catch reactively either (R-06b doesn't apply — there's nothing to
// react to). The edit form shows a plain informational warning instead —
// see PayslipComponentFormFields.tsx.
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
