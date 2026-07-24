import {
  PtkpStatus,
  TerCategory,
  TER_CATEGORY_BY_PTKP_STATUS,
} from '@payroll-system/shared-types';

// P7-T02 — pure, stateless TER lookup core (R1–R3). No DB, no side effects:
// TerBracketMasterService fetches + effective-filters the rows, then hands
// them here. Kept separate so category resolution and rate lookup are
// unit-testable against the P7-T01 worked examples without a database, and so
// P7-T03 can compose them without re-implementing the lookup.

// The minimal shape this core needs from a bracket row — structurally
// satisfied by the TerBracketMaster entity, but deliberately not coupled to
// Sequelize so the pure functions stay DB-free.
export interface TerBracketRow {
  terCategory: TerCategory;
  incomeLowerBound: string;
  incomeUpperBound: string | null;
  rate: string;
}

// R1 — map PTKP status to its TER category (A/B/C). Reuses the single shared
// mapping in shared-types; never a second copy of the grouping (§3).
export function resolveTerCategory(ptkpStatus: PtkpStatus): TerCategory {
  return TER_CATEGORY_BY_PTKP_STATUS[ptkpStatus];
}

// R2/R3 — pick the rate whose bracket contains `monthlyGrossTaxable` for the
// given category. Bounds are inclusive on BOTH sides: a value exactly at a
// bracket's upper bound stays in that (lower) bracket, and +Rp1 crosses to the
// next — the off-by-one guarantee TC-TAX-02 / WE-06 pin down. A null upper
// bound is the open-ended top bracket. Returns the rate as a fraction (e.g.
// 0.02 = 2%).
export function lookupTerRate(
  brackets: TerBracketRow[],
  category: TerCategory,
  monthlyGrossTaxable: number,
): number {
  const match = brackets.find(
    (b) =>
      b.terCategory === category &&
      monthlyGrossTaxable >= Number(b.incomeLowerBound) &&
      (b.incomeUpperBound === null ||
        monthlyGrossTaxable <= Number(b.incomeUpperBound)),
  );
  if (!match) {
    throw new Error(
      `No TER bracket found for category ${category} at income ${monthlyGrossTaxable} — ` +
        `the bracket table has a gap for this period`,
    );
  }
  return Number(match.rate);
}
