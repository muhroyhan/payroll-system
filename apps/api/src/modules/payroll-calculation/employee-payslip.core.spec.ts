import {
  PayslipLineSource,
  PtkpStatus,
  TerCategory,
} from '@payroll-system/shared-types';
import { calculateEmployeePayslip } from './employee-payslip.core';
import { TerBracketRow } from '../tax-bpjs-constants/ter-bracket-master/ter-lookup';
import { BpjsEmployeeRates } from './bpjs-employee.core';
import { BpjsCompanyRates } from './bpjs-company.core';

const BRACKETS: TerBracketRow[] = [
  {
    terCategory: TerCategory.A,
    incomeLowerBound: '7500001',
    incomeUpperBound: '8550000',
    rate: '0.01500',
  },
  {
    terCategory: TerCategory.B,
    incomeLowerBound: '12600001',
    incomeUpperBound: '13600000',
    rate: '0.04000',
  },
];

const EMP_RATES: BpjsEmployeeRates = {
  kesehatanRate: 0.01,
  kesehatanCap: 12_000_000,
  jhtRate: 0.02,
  jpRate: 0.01,
  jpCap: 11_086_300,
};

const CO_RATES: BpjsCompanyRates = {
  kesehatanRate: 0.04,
  kesehatanCap: 12_000_000,
  jhtRate: 0.037,
  jpRate: 0.02,
  jpCap: 11_086_300,
  jkkRate: 0.0024,
  jkmRate: 0.003,
};

describe('calculateEmployeePayslip (P8-T04, §9)', () => {
  // WE-01 end-to-end at the assembly level: base salary 8,000,000 as the only
  // earning → PPh21 120,000, BPJS employee 320,000, net 7,560,000.
  it('WE-01 end-to-end: TK/0, base salary 8,000,000 → net 7,560,000', () => {
    const r = calculateEmployeePayslip({
      ptkpStatus: PtkpStatus.TK_0,
      npwpMissing: false,
      earnings: [
        {
          source: PayslipLineSource.SALARY_MASTER,
          sourceId: 'sal-1',
          componentId: null,
          amount: 8_000_000,
          isTaxable: true,
          isBpjsEligible: true,
        },
      ],
      deductions: [],
      terBrackets: BRACKETS,
      bpjsEmployeeRates: EMP_RATES,
      bpjsCompanyRates: CO_RATES,
    });

    expect(r.grossPay).toBe(8_000_000);
    expect(r.taxableGross).toBe(8_000_000);
    expect(r.pph21Amount).toBe(120_000);
    expect(r.bpjsKesehatanEmployee).toBe(80_000);
    expect(r.bpjsJhtEmployee).toBe(160_000);
    expect(r.bpjsJpEmployee).toBe(80_000);
    expect(r.netPay).toBe(7_560_000);
    // Company-side is tracked but never reduces net.
    expect(r.bpjsKesehatanCompany).toBe(320_000);
    expect(r.bpjsJkkCompany).toBe(19_200);
  });

  it('WE-01: line items are signed and sum to net pay', () => {
    const r = calculateEmployeePayslip({
      ptkpStatus: PtkpStatus.TK_0,
      npwpMissing: false,
      earnings: [
        {
          source: PayslipLineSource.SALARY_MASTER,
          sourceId: 'sal-1',
          componentId: null,
          amount: 8_000_000,
          isTaxable: true,
          isBpjsEligible: true,
        },
      ],
      deductions: [],
      terBrackets: BRACKETS,
      bpjsEmployeeRates: EMP_RATES,
      bpjsCompanyRates: CO_RATES,
    });

    const sum = r.lineItems.reduce((s, li) => s + li.amount, 0);
    expect(sum).toBe(r.netPay);
    // The salary earning carries its source + source_id for traceability.
    const salary = r.lineItems.find(
      (li) => li.source === PayslipLineSource.SALARY_MASTER,
    );
    expect(salary).toMatchObject({ sourceId: 'sal-1', amount: 8_000_000 });
    // Tax and BPJS lines are negative, with null source_id.
    expect(
      r.lineItems.find((li) => li.source === PayslipLineSource.TAX),
    ).toMatchObject({ amount: -120_000, sourceId: null });
    expect(
      r.lineItems.find((li) => li.source === PayslipLineSource.BPJS),
    ).toMatchObject({ amount: -320_000, sourceId: null });
  });

  it('mixes taxable-but-not-BPJS earnings and deductions (kasbon/sanction) into net + traceable lines', () => {
    const r = calculateEmployeePayslip({
      ptkpStatus: PtkpStatus.K_2, // cat B
      npwpMissing: false,
      earnings: [
        {
          source: PayslipLineSource.SALARY_MASTER,
          sourceId: 'sal-1',
          componentId: null,
          amount: 10_000_000,
          isTaxable: true,
          isBpjsEligible: true,
        },
        {
          source: PayslipLineSource.TEMP_COMPONENT,
          sourceId: 'tc-1',
          componentId: 'comp-1',
          amount: 3_000_000,
          isTaxable: true,
          isBpjsEligible: false,
        }, // taxable, not BPJS
      ],
      deductions: [
        {
          source: PayslipLineSource.KASBON,
          sourceId: 'kb-1',
          componentId: null,
          amount: 1_000_000,
        },
        {
          source: PayslipLineSource.SANCTION,
          sourceId: 'sp-1',
          componentId: 'comp-2',
          amount: 250_000,
        },
      ],
      terBrackets: BRACKETS,
      bpjsEmployeeRates: EMP_RATES,
      bpjsCompanyRates: CO_RATES,
    });

    expect(r.grossPay).toBe(13_000_000);
    expect(r.taxableGross).toBe(13_000_000); // salary + temp (both taxable)
    expect(r.bpjsEligibleGross).toBe(10_000_000); // salary only (temp not eligible)
    expect(r.pph21Amount).toBe(520_000); // 13,000,000 × 4% (cat B)
    // net = 13,000,000 − 520,000 − BPJS(on 10M) − 1,250,000 deductions
    const bpjsEmp =
      r.bpjsKesehatanEmployee + r.bpjsJhtEmployee + r.bpjsJpEmployee;
    expect(r.netPay).toBe(13_000_000 - 520_000 - bpjsEmp - 1_250_000);
    // Deduction lines keep their source_id (PayslipReferenceChecker lock).
    expect(
      r.lineItems.find((li) => li.source === PayslipLineSource.KASBON),
    ).toMatchObject({ sourceId: 'kb-1', amount: -1_000_000 });
    expect(
      r.lineItems.find((li) => li.source === PayslipLineSource.SANCTION),
    ).toMatchObject({ sourceId: 'sp-1', amount: -250_000 });
  });

  it('December: pph21Override replaces the monthly TER figure (and can be a refund)', () => {
    const r = calculateEmployeePayslip({
      ptkpStatus: PtkpStatus.TK_0,
      npwpMissing: false,
      earnings: [
        {
          source: PayslipLineSource.SALARY_MASTER,
          sourceId: 'sal-1',
          componentId: null,
          amount: 8_000_000,
          isTaxable: true,
          isBpjsEligible: true,
        },
      ],
      deductions: [],
      terBrackets: BRACKETS,
      bpjsEmployeeRates: EMP_RATES,
      bpjsCompanyRates: CO_RATES,
      pph21Override: -50_000, // year-end refund
    });
    expect(r.pph21Amount).toBe(-50_000);
    // A refund increases net pay.
    expect(r.netPay).toBe(8_000_000 - -50_000 - 320_000);
    expect(
      r.lineItems.find((li) => li.source === PayslipLineSource.TAX),
    ).toMatchObject({ amount: 50_000 });
  });
});
