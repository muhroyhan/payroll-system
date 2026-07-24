// Shared BPJS contribution primitives — ONE definition of "apply a rate to
// (optionally wage-capped) eligible earnings", reused by both the employee-side
// (P7-T03) and company-side (P7-T05) calculators so the cap + rounding logic
// can never diverge between them (§3). Only the rates/caps differ per side.

// Capped program (Kesehatan, JP): rate applied to earnings limited to the cap.
export function cappedContribution(
  eligibleEarnings: number,
  cap: number,
  rate: number,
): number {
  return Math.round(Math.min(eligibleEarnings, cap) * rate);
}

// Uncapped program (JHT, and company-only JKK/JKM): rate on full earnings.
export function uncappedContribution(
  eligibleEarnings: number,
  rate: number,
): number {
  return Math.round(eligibleEarnings * rate);
}
