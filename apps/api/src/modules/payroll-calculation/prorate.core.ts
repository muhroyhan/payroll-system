// Task A (big-test edge-case report) — prorate proporsional for an employee
// who joins or resigns mid-period. Pure/stateless, DB-free.
//
// DECISION (recorded here because neither 05_BOUNDARIES_AND_TESTS.md nor any
// other doc in the bundle ever specifies a prorate method — it was simply
// never designed): prorate on a WORKING-DAYS basis (Mon–Fri minus active
// company holidays), not raw calendar days. This is consistent with the
// existing overtime-pay pattern (overtime-pay.core.ts, PP 35/2021) of scaling
// pay by units of "days/hours actually worked" rather than calendar time —
// and it avoids the calendar-day alternative's flaw of penalizing/crediting a
// partial-month joiner/leaver for weekends and holidays that fall inside
// their (non-)employment window. If this decision needs to change later
// (e.g. to match an HR policy that explicitly wants calendar days), this is
// the single place the ratio is computed.
export interface ProrateResult {
  workingDaysInMonth: number;
  workedWorkingDays: number;
  // workedWorkingDays / workingDaysInMonth. 1 for an employee present the
  // whole period (never > 1).
  factor: number;
  // false when the employee worked every working day of the period — the
  // caller uses this to decide whether to show a "Prorata" indicator at all.
  isProrated: boolean;
}

// Counts Mon–Fri dates in [startInclusive, endExclusive) that are not in
// holidayDates. Both bounds are 'YYYY-MM-DD'; treated as UTC calendar dates
// (no time-of-day/timezone drift across a DST-free comparison).
export function countWorkingDays(
  startInclusive: string,
  endExclusive: string,
  holidayDates: ReadonlySet<string>,
): number {
  const start = new Date(`${startInclusive}T00:00:00Z`);
  const end = new Date(`${endExclusive}T00:00:00Z`);
  let count = 0;
  for (let d = start; d < end; d = addDaysUtc(d, 1)) {
    const dow = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (dow === 0 || dow === 6) continue;
    if (holidayDates.has(toIsoDate(d))) continue;
    count++;
  }
  return count;
}

// periodStart/periodEndExclusive bound the payroll period (e.g.
// '2026-03-01'..'2026-04-01'). employeeStartDate/employeeEndDate are the
// employee's join/resign dates (endDate null = still employed). Holiday
// dates are pre-filtered by the caller to active holidays only.
export function calculateProration(
  periodStart: string,
  periodEndExclusive: string,
  employeeStartDate: string,
  employeeEndDate: string | null,
  holidayDates: readonly string[],
): ProrateResult {
  const holidaySet = new Set(holidayDates);
  const workingDaysInMonth = countWorkingDays(
    periodStart,
    periodEndExclusive,
    holidaySet,
  );

  // The employee's employed window this period, clipped to [periodStart,
  // periodEndExclusive). endDate is inclusive (the last day worked), so its
  // exclusive upper bound is the following day.
  const effectiveStart =
    employeeStartDate > periodStart ? employeeStartDate : periodStart;
  const employeeEndExclusive = employeeEndDate
    ? toIsoDate(addDaysUtc(new Date(`${employeeEndDate}T00:00:00Z`), 1))
    : periodEndExclusive;
  const effectiveEndExclusive =
    employeeEndExclusive < periodEndExclusive
      ? employeeEndExclusive
      : periodEndExclusive;

  const workedWorkingDays =
    effectiveStart < effectiveEndExclusive
      ? countWorkingDays(effectiveStart, effectiveEndExclusive, holidaySet)
      : 0;

  const factor =
    workingDaysInMonth > 0 ? workedWorkingDays / workingDaysInMonth : 1;

  return {
    workingDaysInMonth,
    workedWorkingDays,
    factor,
    isProrated: workedWorkingDays < workingDaysInMonth,
  };
}

function addDaysUtc(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
