import {
  BiayaJabatanConstant,
  Pasal17BracketRow,
  calculateAnnualPph21Trueup,
  pasal17ProgressiveTax,
} from './pph21-annual-trueup.core';

// From the seed (P7-T02): biaya_jabatan_masters + pasal17_bracket_masters.
const BIAYA_JABATAN: BiayaJabatanConstant = {
  rate: 0.05,
  monthlyCap: 500_000,
  annualCap: 6_000_000,
};

const PASAL17: Pasal17BracketRow[] = [
  { incomeLowerBound: '0', incomeUpperBound: '60000000', rate: '0.05000' },
  {
    incomeLowerBound: '60000001',
    incomeUpperBound: '250000000',
    rate: '0.15000',
  },
  {
    incomeLowerBound: '250000001',
    incomeUpperBound: '500000000',
    rate: '0.25000',
  },
  {
    incomeLowerBound: '500000001',
    incomeUpperBound: '5000000000',
    rate: '0.30000',
  },
  { incomeLowerBound: '5000000001', incomeUpperBound: null, rate: '0.35000' },
];

const PTKP_TK0 = 54_000_000;

describe('pasal17ProgressiveTax', () => {
  it('taxes only the first bracket when PKP stays within it (WE-05 PKP)', () => {
    // 56,400,000 × 5% (all within the 0–60,000,000 bracket).
    expect(pasal17ProgressiveTax(56_400_000, PASAL17)).toBe(2_820_000);
  });

  it('taxes across two brackets progressively', () => {
    // 60,000,000 × 5% + 40,000,000 × 15% = 3,000,000 + 6,000,000.
    expect(pasal17ProgressiveTax(100_000_000, PASAL17)).toBe(9_000_000);
  });

  it('taxes across three brackets progressively', () => {
    // 60M×5% + 190M×15% + 50M×25% = 3,000,000 + 28,500,000 + 12,500,000.
    expect(pasal17ProgressiveTax(300_000_000, PASAL17)).toBe(44_000_000);
  });

  it('is zero at PKP 0', () => {
    expect(pasal17ProgressiveTax(0, PASAL17)).toBe(0);
  });
});

describe('calculateAnnualPph21Trueup (P7-T04, R7)', () => {
  // ✅ CONFIRMED FIXTURE — WE-05 version (a) was reconciled to the official DJP
  // calculator (R7 RESOLVED, 03_STRUCTURE.md §7). NOT [pending].
  it('WE-05(a): 10,000,000/month TK/0, full year → December PPh21 620,000', () => {
    const result = calculateAnnualPph21Trueup({
      annualGrossTaxable: 120_000_000, // 10,000,000 × 12
      biayaJabatan: BIAYA_JABATAN,
      ptkpAmount: PTKP_TK0,
      annualEmployeeJht: 2_400_000, // 200,000 × 12
      annualEmployeeJp: 1_200_000, // 100,000 × 12
      pasal17Brackets: PASAL17,
      withheldJanNov: 2_200_000, // 200,000 × 11
    });

    expect(result.biayaJabatan).toBe(6_000_000);
    expect(result.annualNetIncome).toBe(110_400_000);
    expect(result.pkp).toBe(56_400_000);
    expect(result.annualPph21).toBe(2_820_000);
    expect(result.decemberPph21).toBe(620_000);
    expect(result.isRefund).toBe(false);
  });

  // R7 enforcement: the function deducts JHT + JP only, never Kesehatan. If it
  // wrongly deducted Kesehatan too (1,200,000/yr here), net would drop and the
  // December figure would differ — but there's no Kesehatan param to pass, so
  // this documents that WE-05 version (b)'s "no BPJS deduction" 800,000 and any
  // "Kesehatan-deducted" variant are both structurally impossible.
  it('WE-05(a): does NOT produce version (b) 800,000 (which omitted the JHT+JP deduction)', () => {
    const result = calculateAnnualPph21Trueup({
      annualGrossTaxable: 120_000_000,
      biayaJabatan: BIAYA_JABATAN,
      ptkpAmount: PTKP_TK0,
      annualEmployeeJht: 2_400_000,
      annualEmployeeJp: 1_200_000,
      pasal17Brackets: PASAL17,
      withheldJanNov: 2_200_000,
    });
    expect(result.decemberPph21).not.toBe(800_000);
  });

  // Restitution / lebih bayar: Jan–Nov withholding exceeds the annual liability.
  it('returns a negative December figure (refund) when Jan–Nov withheld exceeds the annual liability', () => {
    const result = calculateAnnualPph21Trueup({
      annualGrossTaxable: 120_000_000,
      biayaJabatan: BIAYA_JABATAN,
      ptkpAmount: PTKP_TK0,
      annualEmployeeJht: 2_400_000,
      annualEmployeeJp: 1_200_000,
      pasal17Brackets: PASAL17,
      withheldJanNov: 3_000_000, // > annual PPh21 2,820,000
    });
    expect(result.annualPph21).toBe(2_820_000);
    expect(result.decemberPph21).toBe(-180_000);
    expect(result.isRefund).toBe(true);
  });

  describe('biaya jabatan cap (which of monthly-prorated vs annual binds)', () => {
    it('full year: 5%×gross ties the cap at Rp 6,000,000 (WE-05)', () => {
      const r = calculateAnnualPph21Trueup({
        annualGrossTaxable: 120_000_000, // 5% = 6,000,000 = cap
        biayaJabatan: BIAYA_JABATAN,
        ptkpAmount: PTKP_TK0,
        annualEmployeeJht: 0,
        annualEmployeeJp: 0,
        pasal17Brackets: PASAL17,
        withheldJanNov: 0,
      });
      expect(r.biayaJabatan).toBe(6_000_000);
    });

    it('high income, full year: the annual cap binds (5%×gross would exceed it)', () => {
      const r = calculateAnnualPph21Trueup({
        annualGrossTaxable: 200_000_000, // 5% = 10,000,000 > 6,000,000 cap
        biayaJabatan: BIAYA_JABATAN,
        ptkpAmount: PTKP_TK0,
        annualEmployeeJht: 0,
        annualEmployeeJp: 0,
        pasal17Brackets: PASAL17,
        withheldJanNov: 0,
      });
      expect(r.biayaJabatan).toBe(6_000_000);
    });

    it('partial year (6 months), low income: 5%×gross binds below the prorated cap', () => {
      const r = calculateAnnualPph21Trueup({
        annualGrossTaxable: 40_000_000, // 5% = 2,000,000 < prorated cap 3,000,000
        monthsWorked: 6,
        biayaJabatan: BIAYA_JABATAN,
        ptkpAmount: PTKP_TK0,
        annualEmployeeJht: 0,
        annualEmployeeJp: 0,
        pasal17Brackets: PASAL17,
        withheldJanNov: 0,
      });
      expect(r.biayaJabatan).toBe(2_000_000);
    });

    it('partial year (6 months), high income: the prorated monthly cap (500k×6) binds, not the annual cap', () => {
      const r = calculateAnnualPph21Trueup({
        annualGrossTaxable: 100_000_000, // 5% = 5,000,000; prorated cap = 3,000,000
        monthsWorked: 6,
        biayaJabatan: BIAYA_JABATAN,
        ptkpAmount: PTKP_TK0,
        annualEmployeeJht: 0,
        annualEmployeeJp: 0,
        pasal17Brackets: PASAL17,
        withheldJanNov: 0,
      });
      expect(r.biayaJabatan).toBe(3_000_000); // 500,000 × 6, below the 6,000,000 annual cap
    });
  });

  it('floors PKP down to the nearest Rp 1,000 and never below zero', () => {
    // Gross chosen so raw PKP has a sub-1,000 remainder; and a tiny-income case.
    const tiny = calculateAnnualPph21Trueup({
      annualGrossTaxable: 30_000_000, // net well below PTKP → PKP floored to 0
      biayaJabatan: BIAYA_JABATAN,
      ptkpAmount: PTKP_TK0,
      annualEmployeeJht: 0,
      annualEmployeeJp: 0,
      pasal17Brackets: PASAL17,
      withheldJanNov: 0,
    });
    expect(tiny.pkp).toBe(0);
    expect(tiny.annualPph21).toBe(0);
  });

  it('npwpMissing=true applies a 20% surcharge to the annual PPh21 (P7-T08 scope; signature ready)', () => {
    const r = calculateAnnualPph21Trueup({
      annualGrossTaxable: 120_000_000,
      biayaJabatan: BIAYA_JABATAN,
      ptkpAmount: PTKP_TK0,
      annualEmployeeJht: 2_400_000,
      annualEmployeeJp: 1_200_000,
      pasal17Brackets: PASAL17,
      withheldJanNov: 2_200_000,
      npwpMissing: true,
    });
    // 2,820,000 × 1.2 = 3,384,000 annual; December = 3,384,000 − 2,200,000.
    expect(r.annualPph21).toBe(3_384_000);
    expect(r.decemberPph21).toBe(1_184_000);
  });
});
