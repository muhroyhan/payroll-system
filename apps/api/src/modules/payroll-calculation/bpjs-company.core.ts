import {
  cappedContribution,
  uncappedContribution,
} from './bpjs-contribution.core';

// P7-T05 (§8) — company-side BPJS contributions. Pure company COST: recorded
// for payroll cost reporting and, in Phase 8, written as company-side
// payslip_line_items. It NEVER reduces the employee's net pay, so this
// function is deliberately kept out of the PPh21 / net-pay path (it is not
// called by MonthlyPayslipCalculationService).
//
// Reuses the exact cap + rounding primitives the employee-side calc uses
// (§3) — same eligible-earnings basis and same caps (Kesehatan 12jt, JP cap
// from the same effective-dated card); only the rates differ, plus JKK/JKM
// which are company-only.

export interface BpjsCompanyRates {
  kesehatanRate: number; // 0.04
  kesehatanCap: number; // same cap basis as employee-side (12,000,000)
  jhtRate: number; // 0.037 (no cap)
  jpRate: number; // 0.02
  jpCap: number; // same JP cap table as employee-side
  jkkRate: number; // company-only, risk-class dependent (seed 0.0024); no cap
  jkmRate: number; // company-only, 0.003; no cap
}

export interface BpjsCompanyResult {
  kesehatan: number;
  jht: number;
  jp: number;
  jkk: number;
  jkm: number;
  total: number;
}

export function calculateCompanyBpjs(
  bpjsEligibleEarnings: number,
  rates: BpjsCompanyRates,
): BpjsCompanyResult {
  const kesehatan = cappedContribution(
    bpjsEligibleEarnings,
    rates.kesehatanCap,
    rates.kesehatanRate,
  );
  const jht = uncappedContribution(bpjsEligibleEarnings, rates.jhtRate);
  const jp = cappedContribution(
    bpjsEligibleEarnings,
    rates.jpCap,
    rates.jpRate,
  );
  const jkk = uncappedContribution(bpjsEligibleEarnings, rates.jkkRate);
  const jkm = uncappedContribution(bpjsEligibleEarnings, rates.jkmRate);
  return {
    kesehatan,
    jht,
    jp,
    jkk,
    jkm,
    total: kesehatan + jht + jp + jkk + jkm,
  };
}
