import { calculateProration, countWorkingDays } from './prorate.core';

describe('countWorkingDays', () => {
  it('counts Mon–Fri only over a full week', () => {
    // 2026-03-02 is a Monday; 2026-03-09 (exclusive) is the next Monday.
    expect(countWorkingDays('2026-03-02', '2026-03-09', new Set())).toBe(5);
  });

  it('excludes holiday dates that fall on a weekday', () => {
    expect(
      countWorkingDays('2026-03-02', '2026-03-09', new Set(['2026-03-04'])),
    ).toBe(4);
  });

  it('a holiday on a weekend has no additional effect (already excluded)', () => {
    expect(
      countWorkingDays('2026-03-02', '2026-03-09', new Set(['2026-03-07'])), // Saturday
    ).toBe(5);
  });

  it('empty range returns 0', () => {
    expect(countWorkingDays('2026-03-05', '2026-03-05', new Set())).toBe(0);
  });
});

describe('calculateProration (Task A)', () => {
  // March 2026: 1 Mar is a Sunday, 31 Mar is a Tuesday → 22 working days
  // (verified by direct count, no weekday holidays seeded).
  const PERIOD_START = '2026-03-01';
  const PERIOD_END_EXCLUSIVE = '2026-04-01';

  it('full-month employee (joined before, no resignation) is not prorated', () => {
    const result = calculateProration(
      PERIOD_START,
      PERIOD_END_EXCLUSIVE,
      '2020-01-01',
      null,
      [],
    );
    expect(result.workedWorkingDays).toBe(result.workingDaysInMonth);
    expect(result.factor).toBe(1);
    expect(result.isProrated).toBe(false);
  });

  it('employee joined mid-month → prorated down from join date', () => {
    // Joined Wednesday 2026-03-18 — worked days from 18th through 31st.
    const result = calculateProration(
      PERIOD_START,
      PERIOD_END_EXCLUSIVE,
      '2026-03-18',
      null,
      [],
    );
    expect(result.workingDaysInMonth).toBe(22);
    expect(result.workedWorkingDays).toBe(10); // Wed 18 .. Tue 31, weekdays only
    expect(result.isProrated).toBe(true);
    expect(result.factor).toBeCloseTo(10 / 22, 10);
  });

  it('employee resigned mid-month → still processed, prorated down to resign date (inclusive)', () => {
    // Resigned (last day) Friday 2026-03-13 — worked days from the 1st
    // through the 13th inclusive: two full Mon–Fri weeks (2–6, 9–13).
    const result = calculateProration(
      PERIOD_START,
      PERIOD_END_EXCLUSIVE,
      '2020-01-01',
      '2026-03-13',
      [],
    );
    expect(result.workedWorkingDays).toBe(10);
    expect(result.isProrated).toBe(true);
    expect(result.factor).toBeLessThan(1);
    expect(result.factor).toBeGreaterThan(0);
  });

  it('employee both joined and resigned within the same period → clipped both ends', () => {
    const result = calculateProration(
      PERIOD_START,
      PERIOD_END_EXCLUSIVE,
      '2026-03-09', // Monday
      '2026-03-13', // Friday, same week
      [],
    );
    expect(result.workedWorkingDays).toBe(5);
  });

  it('a holiday inside the worked window reduces workedWorkingDays but not workingDaysInMonth incorrectly', () => {
    const withoutHoliday = calculateProration(
      PERIOD_START,
      PERIOD_END_EXCLUSIVE,
      '2026-03-18',
      null,
      [],
    );
    const withHoliday = calculateProration(
      PERIOD_START,
      PERIOD_END_EXCLUSIVE,
      '2026-03-18',
      null,
      ['2026-03-19'], // a Thursday inside the worked window
    );
    expect(withHoliday.workingDaysInMonth).toBe(withoutHoliday.workingDaysInMonth - 1);
    expect(withHoliday.workedWorkingDays).toBe(withoutHoliday.workedWorkingDays - 1);
  });

  it('employee joined exactly on the first day of the period is not prorated', () => {
    const result = calculateProration(
      PERIOD_START,
      PERIOD_END_EXCLUSIVE,
      PERIOD_START,
      null,
      [],
    );
    expect(result.isProrated).toBe(false);
    expect(result.factor).toBe(1);
  });

  it('employee resigned exactly on the last day of the period is not prorated', () => {
    const result = calculateProration(
      PERIOD_START,
      PERIOD_END_EXCLUSIVE,
      '2020-01-01',
      '2026-03-31',
      [],
    );
    expect(result.isProrated).toBe(false);
    expect(result.factor).toBe(1);
  });
});
