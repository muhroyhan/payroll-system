// §5.1 — raw input feeding ptkp_status derivation (§5.1a).
export enum MaritalStatus {
  SINGLE = "single",
  MARRIED = "married",
}

// §5.1a — needed to model the married-female PTKP exception: a married woman
// defaults to TK (dependents assumed on the husband's PTKP) unless a
// Surat Keterangan proves the husband has no income.
export enum Gender {
  MALE = "male",
  FEMALE = "female",
}

export const MAX_DEPENDENT_COUNT = 3;
