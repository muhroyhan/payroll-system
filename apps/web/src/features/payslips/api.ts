import type { PayslipLineSource } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';

// Mirrors apps/api/src/modules/payslips/entities/payslip.entity.ts. Money
// fields are DECIMAL(15,2) columns, serialized as strings by Sequelize —
// kept as strings here (formatted via formatIDR(Number(value)) at render
// time, same convention as every other master screen), never parsed and
// recomputed (R-07).
export interface PayslipEmployee {
  id: string;
  name: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employee: PayslipEmployee | null;
  grossPay: string;
  taxableGross: string;
  pph21Amount: string;
  bpjsKesehatanEmployee: string;
  bpjsKesehatanCompany: string;
  bpjsJhtEmployee: string;
  bpjsJhtCompany: string;
  bpjsJpEmployee: string;
  bpjsJpCompany: string;
  bpjsJkkCompany: string;
  bpjsJkmCompany: string;
  netPay: string;
  // Server filesystem path (P8-T05) — NEVER render/link this directly (B-05);
  // only used as a truthiness check for whether the PDF download button
  // should be enabled. Fetch the file through GET /:id/pdf instead.
  pdfPath: string | null;
  // Task A — prorate proporsional (join/resign mid-period), working-days
  // basis. Both null for a payslip generated before this feature existed
  // (genuinely untracked, not zero) — the detail page only renders the
  // "Prorata" indicator when both are present AND workedDays < totalWorkingDays.
  workedDays: string | null;
  totalWorkingDays: number | null;
}

// Verified against payslip-line-item.entity.ts: `component` is a BelongsTo
// but GET /payslips/:id does NOT eager-load it (findByIdOrThrow only
// includes 'lineItems', not lineItems.component) — so there is no
// componentType/category field usable here. `source` + the sign of `amount`
// are the only reliable signals; do not invent a category grouping the API
// doesn't expose.
export interface PayslipLineItem {
  id: string;
  payslipId: string;
  componentId: string | null;
  source: PayslipLineSource;
  sourceId: string | null;
  amount: string;
}

// Only GET /payslips/:id returns lineItems — the list endpoint does not.
export interface PayslipDetail extends Payslip {
  lineItems: PayslipLineItem[];
}

export async function listPayslips(payrollRunId: string): Promise<Payslip[]> {
  const { data } = await apiClient.get<Payslip[]>('/payslips', {
    params: { payrollRunId },
  });
  return data;
}

export async function getPayslip(id: string): Promise<PayslipDetail> {
  const { data } = await apiClient.get<PayslipDetail>(`/payslips/${id}`);
  return data;
}
