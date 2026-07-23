import { ScopeType } from '@payroll-system/shared-types';
import { EffectiveDatedFields } from '../../common/effective-dating/resolve-effective';

// Every scope master (salary/incentive/leave-policy) embeds these two columns
// (§5.2) plus effective dates. The resolver is generic over any such table.
export interface ScopedEffectiveRecord extends EffectiveDatedFields {
  scopeType: ScopeType;
  scopeValue: string;
}

// The scope coordinates of one employee — the FK ids the resolver matches
// scope_value against, one per scope_type level.
export interface ScopeContext {
  employeeId: string;
  divisionId: string;
  departmentId: string;
  positionId: string;
  employeeTypeId: string;
}

// Explicit resolved/unresolved result — never a silent null/zero (TC-SCOPE-04).
export type ScopeResolution<M> =
  | { resolved: true; record: M; matchedScopeType: ScopeType }
  | { resolved: false };

// Which employee FK id corresponds to a given scope level.
export function contextValueForScope(
  context: ScopeContext,
  scopeType: ScopeType,
): string {
  switch (scopeType) {
    case ScopeType.EMPLOYEE:
      return context.employeeId;
    case ScopeType.DIVISION:
      return context.divisionId;
    case ScopeType.DEPARTMENT:
      return context.departmentId;
    case ScopeType.POSITION:
      return context.positionId;
    case ScopeType.EMPLOYEE_TYPE:
      return context.employeeTypeId;
  }
}

// The five (scope_type, scope_value) pairs that could match this employee.
export function scopeCandidatePairs(
  context: ScopeContext,
): Array<{ scopeType: ScopeType; scopeValue: string }> {
  return Object.values(ScopeType).map((scopeType) => ({
    scopeType,
    scopeValue: contextValueForScope(context, scopeType),
  }));
}
