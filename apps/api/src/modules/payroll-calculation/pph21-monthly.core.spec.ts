import { PtkpStatus, TerCategory } from '@payroll-system/shared-types';
import { TerBracketRow } from '../tax-bpjs-constants/ter-bracket-master/ter-lookup';
import { calculateMonthlyPph21 } from './pph21-monthly.core';

// TER brackets copied from the seed for the incomes WE-01/02/03 touch.
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
  {
    terCategory: TerCategory.C,
    incomeLowerBound: '19500001',
    incomeUpperBound: '22700000',
    rate: '0.08000',
  },
];

describe('calculateMonthlyPph21 (P7-T03, R3)', () => {
  // ⚠️ PENDING OFFICIAL VERIFICATION — WE-01/02/03 drafted from the seed
  // brackets, NOT yet reconciled to the official DJP calculator (see the
  // "Worked-example verification status" table in 03_STRUCTURE.md §7). If a WE
  // is later corrected, the matching test here is the one to revise.

  it('WE-01 [pending]: TK/0, bruto 8,000,000 → cat A, 1.5%, PPh21 120,000', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 8_000_000,
      ptkpStatus: PtkpStatus.TK_0,
      brackets: BRACKETS,
    });
    expect(r.terCategory).toBe(TerCategory.A);
    expect(r.terRate).toBe(0.015);
    expect(r.pph21).toBe(120_000);
  });

  it('WE-02 [pending]: K/2, bruto 13,000,000 → cat B, 4%, PPh21 520,000', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 13_000_000,
      ptkpStatus: PtkpStatus.K_2,
      brackets: BRACKETS,
    });
    expect(r.terCategory).toBe(TerCategory.B);
    expect(r.terRate).toBe(0.04);
    expect(r.pph21).toBe(520_000);
  });

  it('WE-03 [pending]: K/3, bruto 20,000,000 → cat C, 8%, PPh21 1,600,000', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 20_000_000,
      ptkpStatus: PtkpStatus.K_3,
      brackets: BRACKETS,
    });
    expect(r.terCategory).toBe(TerCategory.C);
    expect(r.terRate).toBe(0.08);
    expect(r.pph21).toBe(1_600_000);
  });

  // Guards the user's explicit ordering concern: TER is applied to GROSS, BPJS
  // is NOT subtracted from the base first (§9 Step 4).
  it('applies TER to gross — BPJS is never subtracted from the base', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 8_000_000,
      ptkpStatus: PtkpStatus.TK_0,
      brackets: BRACKETS,
    });
    // If BPJS (320,000) were wrongly netted off first, this would be
    // (8,000,000 − 320,000) × 1.5% = 115,200 instead of 120,000.
    expect(r.pph21).toBe(120_000);
    expect(r.pph21).not.toBe(115_200);
  });

  // R4 belongs to P7-T08; the flag is wired now so P7-T08 only flips it.
  it('npwpMissing=true applies a 20% surcharge (P7-T08 scope; signature ready)', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 8_000_000,
      ptkpStatus: PtkpStatus.TK_0,
      brackets: BRACKETS,
      npwpMissing: true,
    });
    expect(r.pph21).toBe(144_000); // 120,000 × 1.2
  });

  it('defaults to no surcharge when npwpMissing is omitted', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 8_000_000,
      ptkpStatus: PtkpStatus.TK_0,
      brackets: BRACKETS,
    });
    expect(r.pph21).toBe(120_000);
  });
});
