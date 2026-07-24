import { BpjsEmployeeRates, calculateEmployeeBpjs } from './bpjs-employee.core';

// Rates/caps from the seed: Kesehatan (Perpres 64/2020) 1% cap 12,000,000;
// Ketenagakerjaan 2026-03-01 card — JHT 2% (no cap), JP 1% cap 11,086,300.
const RATES: BpjsEmployeeRates = {
  kesehatanRate: 0.01,
  kesehatanCap: 12_000_000,
  jhtRate: 0.02,
  jpRate: 0.01,
  jpCap: 11_086_300,
};

describe('calculateEmployeeBpjs (P7-T03, R5)', () => {
  // ✅ CONFIRMED — WE-01/02/03 BPJS figures are part of the confirmed worked
  // examples (P7-T07). BPJS is a deterministic percentage-of-wage calc (no
  // rounding-mode question like PPh21), so these are settled.

  it('WE-01 [confirmed]: bruto 8,000,000 (no cap binds) → Kes 80k, JHT 160k, JP 80k, total 320k', () => {
    expect(calculateEmployeeBpjs(8_000_000, RATES)).toEqual({
      kesehatan: 80_000,
      jht: 160_000,
      jp: 80_000,
      total: 320_000,
    });
  });

  it('WE-02 [confirmed]: bruto 13,000,000 (Kes + JP caps bind) → Kes 120k, JHT 260k, JP 110,863, total 490,863', () => {
    expect(calculateEmployeeBpjs(13_000_000, RATES)).toEqual({
      kesehatan: 120_000,
      jht: 260_000,
      jp: 110_863,
      total: 490_863,
    });
  });

  it('WE-03 [confirmed]: bruto 20,000,000 (Kes + JP caps bind) → Kes 120k, JHT 400k, JP 110,863, total 630,863', () => {
    expect(calculateEmployeeBpjs(20_000_000, RATES)).toEqual({
      kesehatan: 120_000,
      jht: 400_000,
      jp: 110_863,
      total: 630_863,
    });
  });

  it('JHT is uncapped while Kesehatan and JP caps bind (WE-03)', () => {
    const r = calculateEmployeeBpjs(20_000_000, RATES);
    expect(r.jht).toBe(400_000); // 20,000,000 × 2%, no cap
    expect(r.kesehatan).toBe(120_000); // min(20M, 12M) × 1%
    expect(r.jp).toBe(110_863); // min(20M, 11,086,300) × 1%
  });
});
