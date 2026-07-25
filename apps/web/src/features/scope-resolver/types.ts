import type { ScopeType } from '@payroll-system/shared-types';

// Mirrors ScopeResolution<M> (apps/api/.../scope-resolver.types.ts) — an
// explicit resolved/unresolved result, never a silent null (TC-SCOPE-04).
// The frontend must not pick a "winner" itself (R-13) — this IS the winner,
// as decided by the backend's resolver. Shared by every scope master's
// GET …/resolve endpoint (salary, incentive, leave-policy, temp-components).
export type ScopeResolution<M> =
  | { resolved: true; record: M; matchedScopeType: ScopeType }
  | { resolved: false };
