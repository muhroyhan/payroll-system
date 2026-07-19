// §5.1 / §5.1a — derived + storable PTKP status. Dependent count capped at 3 per DJP rules.
export enum PtkpStatus {
  TK_0 = "TK/0",
  TK_1 = "TK/1",
  TK_2 = "TK/2",
  TK_3 = "TK/3",
  K_0 = "K/0",
  K_1 = "K/1",
  K_2 = "K/2",
  K_3 = "K/3",
}

// §7 — TER category by PTKP status.
export enum TerCategory {
  A = "A",
  B = "B",
  C = "C",
}

export const TER_CATEGORY_BY_PTKP_STATUS: Record<PtkpStatus, TerCategory> = {
  [PtkpStatus.TK_0]: TerCategory.A,
  [PtkpStatus.TK_1]: TerCategory.A,
  [PtkpStatus.K_0]: TerCategory.A,
  [PtkpStatus.TK_2]: TerCategory.B,
  [PtkpStatus.TK_3]: TerCategory.B,
  [PtkpStatus.K_1]: TerCategory.B,
  [PtkpStatus.K_2]: TerCategory.B,
  [PtkpStatus.K_3]: TerCategory.C,
};
