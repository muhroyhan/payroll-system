import { Select, type SelectProps } from 'antd';

// BUGS#5 — every "tahun" field was a free-typed InputNumber(2000-2100), which
// let a user fat-finger a year nobody has data for. A select bounded to
// years this system could plausibly have data for is both a smaller mistake
// surface and matches how "bulan" (BUGS#22) works. 2026 is this system's
// go-live year (its earliest seed/migration data) — not arbitrary, and not
// meant to move as calendar years pass; the upper bound is `new Date()` each
// render, so the option list grows by one every new year without a
// hardcoded range needing a code change.
const SYSTEM_START_YEAR = 2026;

function currentYear(): number {
  return new Date().getFullYear();
}

function yearOptions(): Array<{ value: number; label: string }> {
  const end = Math.max(currentYear(), SYSTEM_START_YEAR);
  const options = [];
  for (let year = SYSTEM_START_YEAR; year <= end; year += 1) {
    options.push({ value: year, label: String(year) });
  }
  return options;
}

type YearSelectProps = Omit<SelectProps<number>, 'options'>;

export function YearSelect(props: YearSelectProps) {
  return <Select<number> options={yearOptions()} {...props} />;
}
