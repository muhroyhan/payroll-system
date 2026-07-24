import { isNpwpMissing } from './npwp';

describe('isNpwpMissing (P7-T08, R4)', () => {
  it('treats null / undefined as missing (surcharge applies)', () => {
    expect(isNpwpMissing(null)).toBe(true);
    expect(isNpwpMissing(undefined)).toBe(true);
  });

  it('treats a blank / whitespace-only string as missing', () => {
    expect(isNpwpMissing('')).toBe(true);
    expect(isNpwpMissing('   ')).toBe(true);
  });

  it('treats any real NPWP value as present (no surcharge)', () => {
    expect(isNpwpMissing('12.345.678.9-012.000')).toBe(false);
    expect(isNpwpMissing('123456789012000')).toBe(false);
  });
});
