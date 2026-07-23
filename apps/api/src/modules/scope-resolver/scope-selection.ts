import { SCOPE_TYPE_PRIORITY } from '@payroll-system/shared-types';
import {
  isEffectiveOn,
  pickLatestEffective,
} from '../../common/effective-dating/resolve-effective';
import {
  ScopeContext,
  ScopedEffectiveRecord,
  ScopeResolution,
  contextValueForScope,
} from './scope-resolver.types';

// Pure selection core — shared by the DB-backed service and the resolver unit
// tests (TC-SCOPE-01..06), so both exercise identical logic.

/**
 * Given candidate rows, pick the most-specific rule active for `periodDate`.
 * Priority is employee > division > department > position > employee_type
 * (§5.2). Within the winning level, latest-effective wins on overlap.
 * Rows not effective for the period are excluded first (TC-SCOPE-05/06).
 */
export function resolveScopeFromRows<M extends ScopedEffectiveRecord>(
  rows: M[],
  context: ScopeContext,
  periodDate: string,
): ScopeResolution<M> {
  const effective = rows.filter((row) => isEffectiveOn(row, periodDate));

  for (const scopeType of SCOPE_TYPE_PRIORITY) {
    const wantValue = contextValueForScope(context, scopeType);
    const atThisLevel = effective.filter(
      (row) => row.scopeType === scopeType && row.scopeValue === wantValue,
    );
    if (atThisLevel.length > 0) {
      // pickLatestEffective never returns null for a non-empty array.
      const record = pickLatestEffective(atThisLevel) as M;
      return { resolved: true, record, matchedScopeType: scopeType };
    }
  }

  return { resolved: false };
}
