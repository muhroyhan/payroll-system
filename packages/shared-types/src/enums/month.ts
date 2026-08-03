// BUGS#22 — every "bulan" form/column used a raw 1-12 number; this is the
// one place Indonesian month names live, so no screen invents its own copy.
// Index 0 is unused (kept so MONTH_LABELS[periodMonth] indexes directly by
// the 1-12 values the API already stores, no off-by-one translation at each
// call site).
export const MONTH_LABELS = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export interface MonthOption {
  value: number;
  label: string;
}

// 1-12, skipping index 0 — for antd Select `options`.
export const MONTH_OPTIONS: MonthOption[] = MONTH_LABELS.slice(1).map((label, index) => ({
  value: index + 1,
  label,
}));
