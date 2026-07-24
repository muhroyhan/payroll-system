import { roundToNearestHundred } from './rounding';

describe('roundToNearestHundred (P7-T07)', () => {
  it('rounds the WE-07 fraction 157,501.75 down to 157,500 (nearest 100)', () => {
    expect(roundToNearestHundred(157_501.75)).toBe(157_500);
  });

  it('rounds the WE-06 +Rp1 fraction 226,125.0225 to 226,100 (nearest 100)', () => {
    expect(roundToNearestHundred(226_125.0225)).toBe(226_100);
  });

  it('leaves exact multiples of 100 unchanged', () => {
    expect(roundToNearestHundred(120_000)).toBe(120_000);
    expect(roundToNearestHundred(201_000)).toBe(201_000);
  });

  it('rounds up when the remainder is 50 or more', () => {
    expect(roundToNearestHundred(157_550)).toBe(157_600);
    expect(roundToNearestHundred(157_549)).toBe(157_500);
  });

  it('is distinct from nearest-rupiah and floor for a fractional value', () => {
    // 157,501.75: nearest-rupiah=157,502, floor=157,501, nearest-100=157,500.
    expect(roundToNearestHundred(157_501.75)).not.toBe(Math.round(157_501.75));
    expect(roundToNearestHundred(157_501.75)).not.toBe(Math.floor(157_501.75));
  });
});
