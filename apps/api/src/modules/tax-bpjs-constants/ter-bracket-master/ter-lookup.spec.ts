import { PtkpStatus, TerCategory } from '@payroll-system/shared-types';
import { TerBracketRow, lookupTerRate, resolveTerCategory } from './ter-lookup';

// Bracket rows copied verbatim from the seed (seed-ter-bracket-master.js) for
// the exact income values the worked examples touch — so these tests exercise
// the same numbers production will resolve.
const BRACKETS: TerBracketRow[] = [
  // Category A
  {
    terCategory: TerCategory.A,
    incomeLowerBound: '7500001',
    incomeUpperBound: '8550000',
    rate: '0.01500',
  },
  {
    terCategory: TerCategory.A,
    incomeLowerBound: '9650001',
    incomeUpperBound: '10050000',
    rate: '0.02000',
  },
  {
    terCategory: TerCategory.A,
    incomeLowerBound: '10050001',
    incomeUpperBound: '10350000',
    rate: '0.02250',
  },
  // Category B
  {
    terCategory: TerCategory.B,
    incomeLowerBound: '12600001',
    incomeUpperBound: '13600000',
    rate: '0.04000',
  },
  // Category C
  {
    terCategory: TerCategory.C,
    incomeLowerBound: '19500001',
    incomeUpperBound: '22700000',
    rate: '0.08000',
  },
];

describe('resolveTerCategory (R1)', () => {
  it('maps every PTKP status to its documented TER category', () => {
    expect(resolveTerCategory(PtkpStatus.TK_0)).toBe(TerCategory.A);
    expect(resolveTerCategory(PtkpStatus.TK_1)).toBe(TerCategory.A);
    expect(resolveTerCategory(PtkpStatus.K_0)).toBe(TerCategory.A);
    expect(resolveTerCategory(PtkpStatus.TK_2)).toBe(TerCategory.B);
    expect(resolveTerCategory(PtkpStatus.TK_3)).toBe(TerCategory.B);
    expect(resolveTerCategory(PtkpStatus.K_1)).toBe(TerCategory.B);
    expect(resolveTerCategory(PtkpStatus.K_2)).toBe(TerCategory.B);
    expect(resolveTerCategory(PtkpStatus.K_3)).toBe(TerCategory.C);
  });
});

describe('lookupTerRate (R2/R3)', () => {
  // ⚠️ PENDING OFFICIAL VERIFICATION — the WE-01/02/03/06 figures below are
  // drafted from the seed brackets but NOT yet reconciled to the official DJP
  // calculator (see the "Worked-example verification status" table in
  // 03_STRUCTURE.md §7). If a WE is later corrected, the matching test here is
  // the one to revise. WE-04(a)/WE-05(a) are already confirmed and live in
  // §5.1a/§7, not here (this file is TER lookup only).

  it('WE-01 [pending]: TK/0 (cat A), bruto 8,000,000 → 1.50%', () => {
    const category = resolveTerCategory(PtkpStatus.TK_0);
    expect(category).toBe(TerCategory.A);
    expect(lookupTerRate(BRACKETS, category, 8_000_000)).toBe(0.015);
  });

  it('WE-02 [pending]: K/2 (cat B), bruto 13,000,000 → 4.00%', () => {
    const category = resolveTerCategory(PtkpStatus.K_2);
    expect(category).toBe(TerCategory.B);
    expect(lookupTerRate(BRACKETS, category, 13_000_000)).toBe(0.04);
  });

  it('WE-03 [pending]: K/3 (cat C), bruto 20,000,000 → 8.00%', () => {
    const category = resolveTerCategory(PtkpStatus.K_3);
    expect(category).toBe(TerCategory.C);
    expect(lookupTerRate(BRACKETS, category, 20_000_000)).toBe(0.08);
  });

  // WE-06 — the boundary case (TC-TAX-02): inclusive on BOTH sides.
  it('WE-06 [pending]: cat A, bruto exactly 10,050,000 stays in the lower bracket → 2.00%', () => {
    expect(lookupTerRate(BRACKETS, TerCategory.A, 10_050_000)).toBe(0.02);
  });

  it('WE-06 [pending]: cat A, bruto 10,050,001 (+Rp1) crosses to the next bracket → 2.25%', () => {
    expect(lookupTerRate(BRACKETS, TerCategory.A, 10_050_001)).toBe(0.0225);
  });

  it('matches the open-ended top bracket when upper bound is null', () => {
    const withTop: TerBracketRow[] = [
      {
        terCategory: TerCategory.A,
        incomeLowerBound: '1400000001',
        incomeUpperBound: null,
        rate: '0.34000',
      },
    ];
    expect(lookupTerRate(withTop, TerCategory.A, 2_000_000_000)).toBe(0.34);
  });

  it('throws when no bracket contains the income (table gap)', () => {
    expect(() => lookupTerRate(BRACKETS, TerCategory.A, 1_000_000)).toThrow(
      /no ter bracket found/i,
    );
  });

  it('does not match a bracket from a different category', () => {
    // 13,000,000 is a valid cat B income but there is no cat C bracket for it.
    expect(() => lookupTerRate(BRACKETS, TerCategory.C, 13_000_000)).toThrow(
      /no ter bracket found/i,
    );
  });
});
