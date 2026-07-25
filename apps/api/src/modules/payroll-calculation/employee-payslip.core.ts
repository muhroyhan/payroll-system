import { PayslipLineSource, PtkpStatus } from '@payroll-system/shared-types';
import { EarningComponent, assembleEarningsBase } from './earnings-base.core';
import { TerBracketRow } from '../tax-bpjs-constants/ter-bracket-master/ter-lookup';
import { calculateMonthlyPph21 } from './pph21-monthly.core';
import { BpjsEmployeeRates, calculateEmployeeBpjs } from './bpjs-employee.core';
import { BpjsCompanyRates, calculateCompanyBpjs } from './bpjs-company.core';

// P8-T04 — the full §9 per-employee monthly calculation, PURE and testable.
// Every sub-piece is reused from Phase 7 (earnings base, TER/PPh21, BPJS
// employee/company) — this core only orchestrates §9 Steps 1–7 and emits the
// payslip totals + one line item per contributing amount. The DB service
// resolves the inputs (scope cache, kasbon/sanction queries) and persists the
// output; December's annual true-up path is handled there, not here.
//
// ⚠️ Overtime pay is NOT included — §9 references an "overtime rate" that is
// undocumented (no rate/formula/constant exists). Wiring it needs that figure
// documented + seeded first (flagged in the P8-T04 report). Everything else in
// §9 Step 1 is present.

// An earning resolved for this employee/period. base_salary and incentive are
// always taxable + BPJS-eligible (the core wage); temp components carry their
// own flags from payslip_component_master (P7-T06b).
export interface ResolvedEarning {
  source: PayslipLineSource;
  sourceId: string | null;
  componentId: string | null;
  amount: number;
  isTaxable: boolean;
  isBpjsEligible: boolean;
}

// A deduction resolved for this employee/period (kasbon installment, sanction,
// temp deduction component). Reduces net pay; never part of the taxable base.
export interface ResolvedDeduction {
  source: PayslipLineSource;
  sourceId: string | null;
  componentId: string | null;
  amount: number;
}

export interface EmployeePayslipInput {
  ptkpStatus: PtkpStatus;
  npwpMissing: boolean;
  earnings: ResolvedEarning[];
  deductions: ResolvedDeduction[];
  terBrackets: TerBracketRow[];
  bpjsEmployeeRates: BpjsEmployeeRates;
  bpjsCompanyRates: BpjsCompanyRates;
  // December / final-month path (P7-T04): the service computes the annual
  // Pasal 17 true-up amount and passes it here. When present it REPLACES the
  // monthly TER figure (may be negative = a year-end refund). Absent → the
  // normal monthly TER path (Jan–Nov).
  pph21Override?: number;
}

export interface PayslipLineItemDraft {
  source: PayslipLineSource;
  sourceId: string | null;
  componentId: string | null;
  amount: number; // signed: earnings +, deductions −. Σ line items = net pay.
}

export interface EmployeePayslipResult {
  grossPay: number;
  taxableGross: number;
  bpjsEligibleGross: number;
  pph21Amount: number;
  bpjsKesehatanEmployee: number;
  bpjsKesehatanCompany: number;
  bpjsJhtEmployee: number;
  bpjsJhtCompany: number;
  bpjsJpEmployee: number;
  bpjsJpCompany: number;
  bpjsJkkCompany: number;
  bpjsJkmCompany: number;
  netPay: number;
  lineItems: PayslipLineItemDraft[];
}

export function calculateEmployeePayslip(
  input: EmployeePayslipInput,
): EmployeePayslipResult {
  // §9 Step 1–2 — gross + the taxable / BPJS-eligible split.
  const earningComponents: EarningComponent[] = input.earnings.map((e) => ({
    source: 'base_salary', // unused for logic; the split keys off the flags (§3)
    amount: e.amount,
    isTaxable: e.isTaxable,
    isBpjsEligible: e.isBpjsEligible,
  }));
  const base = assembleEarningsBase(earningComponents);

  // §9 Step 4 — PPh21. December passes an override (annual Pasal 17 true-up);
  // otherwise the monthly TER path.
  const pph21Amount =
    input.pph21Override !== undefined
      ? input.pph21Override
      : calculateMonthlyPph21({
          taxableBruto: base.taxableGross,
          ptkpStatus: input.ptkpStatus,
          brackets: input.terBrackets,
          npwpMissing: input.npwpMissing,
        }).pph21;

  // §9 Step 3 — BPJS, employee (reduces net) and company (cost only).
  const bpjsEmployee = calculateEmployeeBpjs(
    base.bpjsEligibleGross,
    input.bpjsEmployeeRates,
  );
  const bpjsCompany = calculateCompanyBpjs(
    base.bpjsEligibleGross,
    input.bpjsCompanyRates,
  );

  // §9 Step 7 — line items. Earnings positive; employee deductions negative.
  const lineItems: PayslipLineItemDraft[] = [];
  for (const e of input.earnings) {
    lineItems.push({
      source: e.source,
      sourceId: e.sourceId,
      componentId: e.componentId,
      amount: e.amount,
    });
  }
  lineItems.push({
    source: PayslipLineSource.TAX,
    sourceId: null,
    componentId: null,
    amount: -pph21Amount,
  });
  lineItems.push({
    source: PayslipLineSource.BPJS,
    sourceId: null,
    componentId: null,
    amount: -bpjsEmployee.total,
  });
  // §9 Step 5 — other deductions.
  const otherDeductionsTotal = input.deductions.reduce(
    (sum, d) => sum + d.amount,
    0,
  );
  for (const d of input.deductions) {
    lineItems.push({
      source: d.source,
      sourceId: d.sourceId,
      componentId: d.componentId,
      amount: -d.amount,
    });
  }

  // §9 Step 6 — net pay (company-side BPJS never reduces it).
  const netPay =
    base.grossEarnings -
    pph21Amount -
    bpjsEmployee.total -
    otherDeductionsTotal;

  return {
    grossPay: base.grossEarnings,
    taxableGross: base.taxableGross,
    bpjsEligibleGross: base.bpjsEligibleGross,
    pph21Amount,
    bpjsKesehatanEmployee: bpjsEmployee.kesehatan,
    bpjsKesehatanCompany: bpjsCompany.kesehatan,
    bpjsJhtEmployee: bpjsEmployee.jht,
    bpjsJhtCompany: bpjsCompany.jht,
    bpjsJpEmployee: bpjsEmployee.jp,
    bpjsJpCompany: bpjsCompany.jp,
    bpjsJkkCompany: bpjsCompany.jkk,
    bpjsJkmCompany: bpjsCompany.jkm,
    netPay,
    lineItems,
  };
}
