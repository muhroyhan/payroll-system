import { PtkpStatus, TerCategory } from '@payroll-system/shared-types';
import { TerBracketRow } from '../tax-bpjs-constants/ter-bracket-master/ter-lookup';
import { calculateMonthlyPph21 } from './pph21-monthly.core';

// TER brackets copied from the seed for the incomes the worked examples touch.
const BRACKETS: TerBracketRow[] = [
  {
    terCategory: TerCategory.A,
    incomeLowerBound: '7500001',
    incomeUpperBound: '8550000',
    rate: '0.01500',
  },
  {
    terCategory: TerCategory.A,
    incomeLowerBound: '8550001',
    incomeUpperBound: '9650000',
    rate: '0.01750',
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
  // ✅ CONFIRMED — WE-01/02/03/06/07 reconciled to the official DJP calculator
  // (P7-T07). Rounding is nearest-Rp-100, confirmed via WE-07 (03_STRUCTURE.md
  // §7). WE-04(a)/WE-05(a) are confirmed elsewhere (§5.1a / annual true-up).

  it('WE-01 [confirmed]: TK/0, bruto 8,000,000 → cat A, 1.5%, PPh21 120,000', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 8_000_000,
      ptkpStatus: PtkpStatus.TK_0,
      brackets: BRACKETS,
    });
    expect(r.terCategory).toBe(TerCategory.A);
    expect(r.terRate).toBe(0.015);
    expect(r.pph21).toBe(120_000);
  });

  it('WE-02 [confirmed]: K/2, bruto 13,000,000 → cat B, 4%, PPh21 520,000', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 13_000_000,
      ptkpStatus: PtkpStatus.K_2,
      brackets: BRACKETS,
    });
    expect(r.terCategory).toBe(TerCategory.B);
    expect(r.terRate).toBe(0.04);
    expect(r.pph21).toBe(520_000);
  });

  it('WE-03 [confirmed]: K/3, bruto 20,000,000 → cat C, 8%, PPh21 1,600,000', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 20_000_000,
      ptkpStatus: PtkpStatus.K_3,
      brackets: BRACKETS,
    });
    expect(r.terCategory).toBe(TerCategory.C);
    expect(r.terRate).toBe(0.08);
    expect(r.pph21).toBe(1_600_000);
  });

  // WE-06 [confirmed] — boundary (TC-TAX-02). Rate/bracket boundary confirmed;
  // the +Rp1 value's PPh21 is recomputed here with the correct nearest-100
  // rounding (the draft's 226,125.02 was pre-rounding, not final).
  it('WE-06 [confirmed]: cat A, bruto 10,050,000 (bracket upper) → 2%, PPh21 201,000', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 10_050_000,
      ptkpStatus: PtkpStatus.TK_0,
      brackets: BRACKETS,
    });
    expect(r.terRate).toBe(0.02);
    expect(r.pph21).toBe(201_000); // 10,050,000 × 2% = 201,000 (already ×100)
  });

  it('WE-06 [confirmed]: cat A, bruto 10,050,001 (+Rp1) → 2.25%, PPh21 226,100 (nearest-100)', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 10_050_001,
      ptkpStatus: PtkpStatus.TK_0,
      brackets: BRACKETS,
    });
    expect(r.terRate).toBe(0.0225);
    // 10,050,001 × 2.25% = 226,125.0225 → nearest-100 = 226,100.
    expect(r.pph21).toBe(226_100);
  });

  // WE-07 [confirmed] — the rounding-mode fixture. bruto 9,000,100 (TK/0,
  // 1.75%) = 157,501.75. Confirmed 157,500 = nearest-Rp-100, NOT nearest-rupiah
  // (Math.round would give 157,502) nor floor (157,501).
  it('WE-07 [confirmed]: TK/0, bruto 9,000,100 → 1.75%, PPh21 157,500 (round to nearest 100)', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 9_000_100,
      ptkpStatus: PtkpStatus.TK_0,
      brackets: BRACKETS,
    });
    expect(r.terRate).toBe(0.0175);
    expect(r.pph21).toBe(157_500);
    // Explicitly NOT the other rounding modes:
    expect(r.pph21).not.toBe(157_502); // nearest rupiah (old Math.round)
    expect(r.pph21).not.toBe(157_501); // floor
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

  it('defaults to no surcharge when npwpMissing is omitted', () => {
    const r = calculateMonthlyPph21({
      taxableBruto: 8_000_000,
      ptkpStatus: PtkpStatus.TK_0,
      brackets: BRACKETS,
    });
    expect(r.pph21).toBe(120_000);
  });

  // R4 (P7-T08) — no NPWP on file adds a 20% surcharge. Compared against the
  // same WE-01/02/03 baselines.
  describe('npwpMissing surcharge (P7-T08, R4)', () => {
    it('WE-01 no NPWP: 120,000 × 1.2 = 144,000', () => {
      const r = calculateMonthlyPph21({
        taxableBruto: 8_000_000,
        ptkpStatus: PtkpStatus.TK_0,
        brackets: BRACKETS,
        npwpMissing: true,
      });
      expect(r.pph21).toBe(144_000);
    });

    it('WE-02 no NPWP: 520,000 × 1.2 = 624,000', () => {
      const r = calculateMonthlyPph21({
        taxableBruto: 13_000_000,
        ptkpStatus: PtkpStatus.K_2,
        brackets: BRACKETS,
        npwpMissing: true,
      });
      expect(r.pph21).toBe(624_000);
    });

    it('WE-03 no NPWP: 1,600,000 × 1.2 = 1,920,000', () => {
      const r = calculateMonthlyPph21({
        taxableBruto: 20_000_000,
        ptkpStatus: PtkpStatus.K_3,
        brackets: BRACKETS,
        npwpMissing: true,
      });
      expect(r.pph21).toBe(1_920_000);
    });

    // Order matters: surcharge is applied BEFORE the nearest-100 rounding.
    // bruto 10,100,050 × 2.25% = 227,251.125.
    //   correct   → round100(227,251.125 × 1.2) = round100(272,701.35) = 272,700
    //   wrong way → round100(227,251.125) × 1.2  = 227,300 × 1.2        = 272,760
    it('applies the surcharge BEFORE rounding to nearest 100, not after', () => {
      const r = calculateMonthlyPph21({
        taxableBruto: 10_100_050,
        ptkpStatus: PtkpStatus.TK_0,
        brackets: BRACKETS,
        npwpMissing: true,
      });
      expect(r.pph21).toBe(272_700); // surcharge-before-rounding
      expect(r.pph21).not.toBe(272_760); // surcharge-after-rounding (wrong)
    });
  });
});
