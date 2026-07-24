import { BpjsCompanyRates, calculateCompanyBpjs } from './bpjs-company.core';

// Company rates from the seed: Kesehatan (Perpres 64/2020) 4% cap 12,000,000;
// Ketenagakerjaan 2026-03-01 card — JHT 3.7% (no cap), JP 2% cap 11,086,300,
// JKK 0.24% (Risk Class I), JKM 0.3%.
const RATES: BpjsCompanyRates = {
  kesehatanRate: 0.04,
  kesehatanCap: 12_000_000,
  jhtRate: 0.037,
  jpRate: 0.02,
  jpCap: 11_086_300,
  jkkRate: 0.0024,
  jkmRate: 0.003,
};

// Reuses the BPJS-eligible earnings from WE-01/02/03 (8jt / 13jt / 20jt) purely
// for numeric consistency with the employee-side examples. NOTE: these company
// figures are NOT part of the official DJP worked example — company cost is a
// straight percentage calc that needs no official-calculator verification, so
// they carry no [pending] gate.
describe('calculateCompanyBpjs (P7-T05, §8)', () => {
  it('WE-01 basis (8,000,000, no cap binds)', () => {
    expect(calculateCompanyBpjs(8_000_000, RATES)).toEqual({
      kesehatan: 320_000, // min(8jt,12jt) × 4%
      jht: 296_000, // 8jt × 3.7%
      jp: 160_000, // min(8jt, 11,086,300) × 2%
      jkk: 19_200, // 8jt × 0.24%
      jkm: 24_000, // 8jt × 0.3%
      total: 819_200,
    });
  });

  it('WE-02 basis (13,000,000, Kesehatan + JP caps bind)', () => {
    expect(calculateCompanyBpjs(13_000_000, RATES)).toEqual({
      kesehatan: 480_000, // min(13jt,12jt)=12jt × 4%
      jht: 481_000, // 13jt × 3.7%
      jp: 221_726, // min(13jt, 11,086,300)=11,086,300 × 2%
      jkk: 31_200, // 13jt × 0.24%
      jkm: 39_000, // 13jt × 0.3%
      total: 1_252_926,
    });
  });

  it('WE-03 basis (20,000,000, Kesehatan + JP caps bind)', () => {
    expect(calculateCompanyBpjs(20_000_000, RATES)).toEqual({
      kesehatan: 480_000, // capped at 12jt × 4%
      jht: 740_000, // 20jt × 3.7% (uncapped)
      jp: 221_726, // capped at 11,086,300 × 2%
      jkk: 48_000, // 20jt × 0.24%
      jkm: 60_000, // 20jt × 0.3%
      total: 1_549_726,
    });
  });

  it('uses the SAME caps as the employee side: Kesehatan caps at 12jt, JP at its card cap, JHT/JKK/JKM uncapped', () => {
    const r = calculateCompanyBpjs(20_000_000, RATES);
    expect(r.kesehatan).toBe(480_000); // min(20jt, 12jt) × 4%
    expect(r.jp).toBe(221_726); // min(20jt, 11,086,300) × 2%
    expect(r.jht).toBe(740_000); // 20jt × 3.7%, uncapped
    expect(r.jkk).toBe(48_000); // 20jt × 0.24%, uncapped
    expect(r.jkm).toBe(60_000); // 20jt × 0.3%, uncapped
  });
});
