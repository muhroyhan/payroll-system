import { PtkpStatus, TerCategory } from '@payroll-system/shared-types';
import { TerBracketRow } from '../tax-bpjs-constants/ter-bracket-master/ter-lookup';
import {
  EarningComponent,
  assembleEarningsBase,
  tempComponentToEarning,
} from './earnings-base.core';
import { calculateMonthlyPph21 } from './pph21-monthly.core';
import { BpjsEmployeeRates, calculateEmployeeBpjs } from './bpjs-employee.core';

// A realistic month: base + incentive are taxable AND BPJS-eligible; temp
// (earning), overtime, and THR are taxable but NOT BPJS-eligible (one-off /
// incidental, §9 Step 2); a reimbursement is neither.
const MONTH: EarningComponent[] = [
  {
    source: 'base_salary',
    amount: 10_000_000,
    isTaxable: true,
    isBpjsEligible: true,
  },
  {
    source: 'incentive',
    amount: 2_000_000,
    isTaxable: true,
    isBpjsEligible: true,
  },
  {
    source: 'temp_component',
    amount: 500_000,
    isTaxable: true,
    isBpjsEligible: false,
  },
  {
    source: 'overtime',
    amount: 1_000_000,
    isTaxable: true,
    isBpjsEligible: false,
  },
  { source: 'thr', amount: 10_000_000, isTaxable: true, isBpjsEligible: false },
  {
    source: 'temp_component',
    amount: 300_000,
    isTaxable: false,
    isBpjsEligible: false,
  }, // reimbursement
];

describe('assembleEarningsBase (P7-T06, §9 Step 1–2)', () => {
  it('assembles gross, taxable, and BPJS-eligible as three distinct totals', () => {
    const base = assembleEarningsBase(MONTH);
    expect(base.grossEarnings).toBe(23_800_000); // everything
    expect(base.taxableGross).toBe(23_500_000); // all except the non-taxable reimbursement
    expect(base.bpjsEligibleGross).toBe(12_000_000); // only base + incentive
  });

  it('THR is taxable (into the monthly TER base, §7) but NOT BPJS-eligible', () => {
    const thrOnly = assembleEarningsBase([
      {
        source: 'thr',
        amount: 10_000_000,
        isTaxable: true,
        isBpjsEligible: false,
      },
    ]);
    expect(thrOnly.taxableGross).toBe(10_000_000);
    expect(thrOnly.bpjsEligibleGross).toBe(0);
  });

  it('a non-taxable component adds to gross only, neither base', () => {
    const r = assembleEarningsBase([
      {
        source: 'temp_component',
        amount: 300_000,
        isTaxable: false,
        isBpjsEligible: false,
      },
    ]);
    expect(r.grossEarnings).toBe(300_000);
    expect(r.taxableGross).toBe(0);
    expect(r.bpjsEligibleGross).toBe(0);
  });

  // §3 — the split keys off flags, NEVER the component kind. Two components with
  // different `source` but identical flags must contribute identically.
  it('keys off the flags, not the source (no hardcoding tax category per kind)', () => {
    const asOvertime = assembleEarningsBase([
      {
        source: 'overtime',
        amount: 1_000_000,
        isTaxable: true,
        isBpjsEligible: false,
      },
    ]);
    const asIncentive = assembleEarningsBase([
      {
        source: 'incentive',
        amount: 1_000_000,
        isTaxable: true,
        isBpjsEligible: false,
      },
    ]);
    expect(asOvertime).toEqual(asIncentive);
  });

  it('empty month → all zeros', () => {
    expect(assembleEarningsBase([])).toEqual({
      grossEarnings: 0,
      taxableGross: 0,
      bpjsEligibleGross: 0,
    });
  });
});

describe('tempComponentToEarning (P6-T01 link, P7-T06b data-driven)', () => {
  it('reads BOTH isTaxable and isBpjsEligible straight from the loaded component master association, not hardcoded', () => {
    const taxableAndEligible = tempComponentToEarning({
      amount: '500000.00',
      component: { isTaxable: true, isBpjsEligible: true },
    });
    expect(taxableAndEligible).toEqual({
      source: 'temp_component',
      amount: 500_000,
      isTaxable: true, // came from component.isTaxable
      isBpjsEligible: true, // came from component.isBpjsEligible
    });

    const taxableNotEligible = tempComponentToEarning({
      amount: '500000.00',
      component: { isTaxable: true, isBpjsEligible: false },
    });
    expect(taxableNotEligible.isTaxable).toBe(true);
    expect(taxableNotEligible.isBpjsEligible).toBe(false);

    const neither = tempComponentToEarning({
      amount: '300000.00',
      component: { isTaxable: false, isBpjsEligible: false },
    });
    expect(neither.isTaxable).toBe(false);
    expect(neither.isBpjsEligible).toBe(false);
  });

  // The two flags are independent columns — one being true must not leak
  // into the other just because they came from the same master row.
  it('does not couple the two flags together (independent columns)', () => {
    const eligibleNotTaxable = tempComponentToEarning({
      amount: '100000.00',
      component: { isTaxable: false, isBpjsEligible: true },
    });
    expect(eligibleNotTaxable.isTaxable).toBe(false);
    expect(eligibleNotTaxable.isBpjsEligible).toBe(true);
  });
});

// Proves the task's contract: assemble the bases, THEN reuse P7-T03/T05 to
// calculate — the two DIFFERENT bases feed two DIFFERENT calculators.
describe('assembled bases feed P7-T03 calculators (reuse, no recompute here)', () => {
  const BRACKETS: TerBracketRow[] = [
    // cat A bracket covering 23,500,000
    {
      terCategory: TerCategory.A,
      incomeLowerBound: '19750001',
      incomeUpperBound: '24150000',
      rate: '0.09000',
    },
  ];
  const BPJS_RATES: BpjsEmployeeRates = {
    kesehatanRate: 0.01,
    kesehatanCap: 12_000_000,
    jhtRate: 0.02,
    jpRate: 0.01,
    jpCap: 11_086_300,
  };

  it('taxableGross → TER, bpjsEligibleGross → BPJS (different bases, different calcs)', () => {
    const base = assembleEarningsBase(MONTH);

    const pph21 = calculateMonthlyPph21({
      taxableBruto: base.taxableGross, // 23,500,000
      ptkpStatus: PtkpStatus.TK_0,
      brackets: BRACKETS,
    });
    expect(pph21.pph21).toBe(2_115_000); // 23,500,000 × 9%

    const bpjs = calculateEmployeeBpjs(base.bpjsEligibleGross, BPJS_RATES); // 12,000,000
    expect(bpjs).toEqual({
      kesehatan: 120_000, // min(12M, 12M) × 1%
      jht: 240_000, // 12M × 2%
      jp: 110_863, // min(12M, 11,086,300) × 1%
      total: 470_863,
    });
  });
});
