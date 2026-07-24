// Tax-engine rounding rules, named explicitly so the intent is auditable
// rather than buried in an inline `Math.round(x / 100) * 100`.

// PPh21 monthly (Jan–Nov) withholding is rounded to the nearest Rp 100.
// CONFIRMED against the official DJP calculator via worked example WE-07
// (P7-T07): bruto 9,000,100 (TK/0, TER 1.75%) = 157,501.75 → 157,500 —
// nearest-100, NOT nearest-rupiah (`Math.round` would give 157,502).
export function roundToNearestHundred(value: number): number {
  return Math.round(value / 100) * 100;
}
