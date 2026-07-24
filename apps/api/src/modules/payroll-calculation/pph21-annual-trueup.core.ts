// P7-T04 — December / final-month PPh21 annual true-up (R7, §9 Step 4 December
// path). Pure/stateless: the biaya jabatan constant and Pasal 17 brackets are
// fetched by the caller (from biaya_jabatan_masters / pasal17_bracket_masters,
// seeded in P7-T02) and passed in — never re-implemented here.
//
// R7 (confirmed via WE-05 version a, official DJP calculator): the annual
// deductions are biaya jabatan + employee JHT + employee JP ONLY. BPJS
// Kesehatan employee is NOT a deductible pengurang — enforced structurally by
// this signature having no Kesehatan parameter at all.

export interface BiayaJabatanConstant {
  rate: number; // e.g. 0.05
  monthlyCap: number; // e.g. 500000
  annualCap: number; // e.g. 6000000
}

export interface Pasal17BracketRow {
  incomeLowerBound: string;
  incomeUpperBound: string | null; // null = open-ended top bracket
  rate: string;
}

export interface AnnualPph21TrueupInput {
  annualGrossTaxable: number;
  // Prorates the biaya jabatan cap for partial-year employees; full year = 12.
  monthsWorked?: number;
  biayaJabatan: BiayaJabatanConstant;
  ptkpAmount: number;
  annualEmployeeJht: number;
  annualEmployeeJp: number;
  pasal17Brackets: Pasal17BracketRow[];
  // Sum of the monthly TER PPh21 already withheld Jan–Nov.
  withheldJanNov: number;
  // R4 — no NPWP adds a 20% surcharge. P7-T08 owns it; wired into the
  // signature now (default false) so P7-T08 only flips the flag.
  npwpMissing?: boolean;
}

export interface AnnualPph21TrueupResult {
  biayaJabatan: number;
  annualNetIncome: number;
  pkp: number;
  annualPph21: number;
  withheldJanNov: number;
  // annualPph21 − withheldJanNov. NEGATIVE = the employee overpaid Jan–Nov and
  // is owed a refund (lebih bayar / restitusi).
  decemberPph21: number;
  isRefund: boolean;
}

// Progressive Pasal 17 tax on PKP. Unlike TER (a flat rate on the whole
// amount), each bracket taxes only its own slice. The seed's inclusive
// integer lower bounds (`prevUpper + 1`) mean the continuous floor of each
// bracket is the previous bracket's upper — so slices are computed against
// `prevUpper`, not the raw lower_bound.
export function pasal17ProgressiveTax(
  pkp: number,
  brackets: Pasal17BracketRow[],
): number {
  const sorted = [...brackets].sort(
    (a, b) => Number(a.incomeLowerBound) - Number(b.incomeLowerBound),
  );
  let tax = 0;
  let floor = 0;
  for (const bracket of sorted) {
    if (pkp <= floor) break;
    const upper =
      bracket.incomeUpperBound === null
        ? Infinity
        : Number(bracket.incomeUpperBound);
    const slice = Math.min(pkp, upper) - floor;
    tax += slice * Number(bracket.rate);
    floor = upper;
  }
  return tax;
}

export function calculateAnnualPph21Trueup(
  input: AnnualPph21TrueupInput,
): AnnualPph21TrueupResult {
  const monthsWorked = input.monthsWorked ?? 12;

  // Biaya jabatan: 5% of gross, capped by the LOWER of (monthly cap × months
  // worked) and the annual cap. For a full year the two coincide (Rp 6jt); for
  // a partial year the prorated monthly cap is lower and binds first.
  const cap = Math.min(
    input.biayaJabatan.monthlyCap * monthsWorked,
    input.biayaJabatan.annualCap,
  );
  const biayaJabatan = Math.min(
    input.biayaJabatan.rate * input.annualGrossTaxable,
    cap,
  );

  // R7 — deduct biaya jabatan + employee JHT + employee JP (NOT Kesehatan).
  const annualNetIncome =
    input.annualGrossTaxable -
    biayaJabatan -
    input.annualEmployeeJht -
    input.annualEmployeeJp;

  // PKP = net − PTKP, floored to the nearest Rp 1,000 (DJP), never below 0.
  const rawPkp = annualNetIncome - input.ptkpAmount;
  const pkp = Math.max(0, Math.floor(rawPkp / 1000) * 1000);

  let annualPph21 = pasal17ProgressiveTax(pkp, input.pasal17Brackets);
  if (input.npwpMissing) {
    annualPph21 = annualPph21 * 1.2; // R4 — P7-T08 scope; signature ready.
  }
  // ⚠️ OPEN ITEM (P7-T07) — the ANNUAL rounding mode is NOT verified. The
  // monthly path was confirmed as round-to-nearest-100 (WE-07), but WE-05
  // (the only confirmed December example) lands on an exact multiple of 100,
  // so it proves nothing here. The annual figure could be round-100 (like
  // monthly), plain nearest-rupiah, or truncate — do NOT assume it matches
  // monthly. Left as Math.round (unchanged) until a fractional December
  // worked example pins it. See 04_STEPS.md P7-T07.
  annualPph21 = Math.round(annualPph21);

  const decemberPph21 = annualPph21 - input.withheldJanNov;
  return {
    biayaJabatan,
    annualNetIncome,
    pkp,
    annualPph21,
    withheldJanNov: input.withheldJanNov,
    decemberPph21,
    isRefund: decemberPph21 < 0,
  };
}
