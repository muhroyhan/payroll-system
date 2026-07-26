/**
 * Mirrors the enum string VALUES in packages/shared-types/src/enums/*.ts —
 * not re-exported from that package directly because its CJS build
 * (dist/index.js) re-exports enums via a runtime `for..in` loop
 * (TypeScript's `__exportStar` helper), which cjs-module-lexer can't see
 * statically, and Playwright's test loader resolves this workspace package
 * through its "import" exports condition even when `require()`-ing it,
 * landing on the real-ESM dist/esm build via Node's CJS loader (a hard
 * SyntaxError on the bare `export` syntax) — a resolution-order interaction
 * between the package's `exports` map and Playwright's loader, not
 * something apps/web's own Vite build ever hits. Keeping these as plain
 * string literals here sidesteps it entirely for the e2e suite specifically,
 * without touching the shared package's build (which every other consumer,
 * including the whole apps/web src tree, already relies on as-is).
 *
 * If any of these values change in shared-types, this file must change too.
 * Drift is caught (not silently ignored) by ./enums.spec.ts, a vitest test
 * — not a Playwright spec, specifically so it can import the real package
 * without hitting the same loader issue — that runs automatically before
 * `test:e2e` via the `pretest:e2e` script in package.json.
 */
export const Role = {
  ADMIN: 'admin',
  HR_STAFF: 'hr_staff',
} as const;

export const EmployeeActiveStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
export type EmployeeActiveStatus = (typeof EmployeeActiveStatus)[keyof typeof EmployeeActiveStatus];

export const EmploymentStatus = {
  TETAP: 'tetap',
  TIDAK_TETAP: 'tidak_tetap',
} as const;

export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
} as const;

export const MaritalStatus = {
  SINGLE: 'single',
  MARRIED: 'married',
} as const;

export const PtkpStatus = {
  TK_0: 'TK/0',
} as const;

export const PayrollRunStatus = {
  DRAFT: 'draft',
  CALCULATED: 'calculated',
  APPROVED: 'approved',
  DISBURSED: 'disbursed',
} as const;
export type PayrollRunStatus = (typeof PayrollRunStatus)[keyof typeof PayrollRunStatus];

export const ScopeType = {
  EMPLOYEE: 'employee',
} as const;

export const SPLevel = {
  SP1: 'SP1',
} as const;

export const SuratIjinType = {
  LATE_ARRIVAL: 'late_arrival',
} as const;
