import { calculateOvertimePay } from './overtime-pay.core';

// base 8,650,000 → hourly = 8,650,000 / 173 = 50,000 exactly (clean numbers).
const BASE = 8_650_000;

describe('calculateOvertimePay (R9, PP 35/2021 Pasal 31)', () => {
  it('is 0 for no overtime hours', () => {
    expect(calculateOvertimePay(BASE, 0)).toBe(0);
  });

  it('first hour is 1.5 × hourly (1 hour → 75,000)', () => {
    // 1.5 × 50,000 × 1 = 75,000.
    expect(calculateOvertimePay(BASE, 1)).toBe(75_000);
  });

  it('hours after the first are 2 × hourly (3 hours → 275,000)', () => {
    // 1.5×50,000 (hour 1) + 2×50,000×2 (hours 2–3) = 75,000 + 200,000.
    expect(calculateOvertimePay(BASE, 3)).toBe(275_000);
  });

  it('handles fractional hours (2.5 hours → 225,000)', () => {
    // 1.5×50,000 (hour 1) + 2×50,000×1.5 (1.5 more hours) = 75,000 + 150,000.
    expect(calculateOvertimePay(BASE, 2.5)).toBe(225_000);
  });

  it('caps the first-hour premium at exactly one hour (0.5 hours → 37,500)', () => {
    // 1.5 × 50,000 × 0.5 = 37,500 (no "after first hour" portion).
    expect(calculateOvertimePay(BASE, 0.5)).toBe(37_500);
  });

  it('rounds to whole rupiah when base ÷ 173 is fractional', () => {
    // 10,000,000 / 173 = 57,803.4682... ; 1 hour = 1.5 × that = 86,705.20 → 86,705.
    expect(calculateOvertimePay(10_000_000, 1)).toBe(86_705);
  });

  it('is 0 when base salary is unresolved/zero', () => {
    expect(calculateOvertimePay(0, 5)).toBe(0);
  });
});
