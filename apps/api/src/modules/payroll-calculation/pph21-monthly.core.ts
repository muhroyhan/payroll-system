import { PtkpStatus, TerCategory } from '@payroll-system/shared-types';
import {
  TerBracketRow,
  lookupTerRate,
  resolveTerCategory,
} from '../tax-bpjs-constants/ter-bracket-master/ter-lookup';
import { roundToNearestHundred } from './rounding';

// P7-T03 — monthly (Jan–Nov) PPh21 via TER (R3, §9 Step 4). Pure/stateless:
// the DB-backed service fetches the effective TER brackets and passes them in.
// Reuses P7-T02's resolveTerCategory + lookupTerRate verbatim — never a second
// lookup implementation (§3).

export interface MonthlyPph21Input {
  // §9 Step 4 — TER applies to GROSS monthly taxable income. Employee BPJS
  // contributions do NOT reduce this base (that subtraction only happens in
  // the December annual recompute, P7-T04). This must be the gross figure,
  // never net-of-BPJS.
  taxableBruto: number;
  ptkpStatus: PtkpStatus;
  // Effective TER brackets for the period (already category-agnostic list or
  // pre-filtered) — passed in to keep this a pure function.
  brackets: TerBracketRow[];
  // R4 — no NPWP on file adds a 20% surcharge. P7-T08 owns that rule; the flag
  // is wired into the signature now (defaults false) so P7-T08 only flips it,
  // never changes this signature.
  npwpMissing?: boolean;
}

export interface MonthlyPph21Result {
  terCategory: TerCategory;
  terRate: number;
  pph21: number;
}

export function calculateMonthlyPph21(
  input: MonthlyPph21Input,
): MonthlyPph21Result {
  const terCategory = resolveTerCategory(input.ptkpStatus);
  const terRate = lookupTerRate(
    input.brackets,
    terCategory,
    input.taxableBruto,
  );
  const surcharge = input.npwpMissing ? 1.2 : 1;
  // Rounded to the nearest Rp 100 — CONFIRMED via WE-07 (P7-T07), replacing
  // the earlier unverified `Math.round`-per-rupiah. See rounding.ts.
  const pph21 = roundToNearestHundred(input.taxableBruto * terRate * surcharge);
  return { terCategory, terRate, pph21 };
}
