import { ScopeType } from '@payroll-system/shared-types';
import { resolveScopeFromRows } from './scope-selection';
import { ScopeContext, ScopedEffectiveRecord } from './scope-resolver.types';

// TC-SCOPE-01..06 (§12.2). These exercise the pure selection core that the
// DB-backed ScopeResolverService also calls, so passing here means the live
// resolver selects identically.

const CONTEXT: ScopeContext = {
  employeeId: 'emp-1',
  divisionId: 'div-1',
  departmentId: 'dep-1',
  positionId: 'pos-1',
  employeeTypeId: 'type-1',
};

const PERIOD = '2026-07-01';

// Minimal row factory — a tagged value lets us assert which row was picked.
function row(
  scopeType: ScopeType,
  scopeValue: string,
  tag: string,
  effectiveStartDate = '2026-01-01',
  effectiveEndDate: string | null = null,
): ScopedEffectiveRecord & { tag: string } {
  return { scopeType, scopeValue, effectiveStartDate, effectiveEndDate, tag };
}

describe('resolveScopeFromRows (TC-SCOPE)', () => {
  it('TC-SCOPE-01: rule only at employee_type level resolves there', () => {
    const rows = [row(ScopeType.EMPLOYEE_TYPE, 'type-1', 'type')];
    const result = resolveScopeFromRows(rows, CONTEXT, PERIOD);
    expect(result).toMatchObject({
      resolved: true,
      matchedScopeType: ScopeType.EMPLOYEE_TYPE,
    });
    expect(result.resolved && result.record.tag).toBe('type');
  });

  it('TC-SCOPE-02: employee-level rule beats employee_type-level for the same employee', () => {
    const rows = [
      row(ScopeType.EMPLOYEE_TYPE, 'type-1', 'type'),
      row(ScopeType.EMPLOYEE, 'emp-1', 'employee'),
    ];
    const result = resolveScopeFromRows(rows, CONTEXT, PERIOD);
    expect(result.resolved && result.matchedScopeType).toBe(ScopeType.EMPLOYEE);
    expect(result.resolved && result.record.tag).toBe('employee');
  });

  it('TC-SCOPE-03: division-level rule beats department-level (more specific)', () => {
    const rows = [
      row(ScopeType.DEPARTMENT, 'dep-1', 'department'),
      row(ScopeType.DIVISION, 'div-1', 'division'),
    ];
    const result = resolveScopeFromRows(rows, CONTEXT, PERIOD);
    expect(result.resolved && result.matchedScopeType).toBe(ScopeType.DIVISION);
    expect(result.resolved && result.record.tag).toBe('division');
  });

  it('TC-SCOPE-04: no matching rule returns an explicit unresolved result (not silent null)', () => {
    // Rows exist but for OTHER scope values — must not match this employee.
    const rows = [
      row(ScopeType.DIVISION, 'other-div', 'nope'),
      row(ScopeType.EMPLOYEE, 'other-emp', 'nope'),
    ];
    expect(resolveScopeFromRows(rows, CONTEXT, PERIOD)).toEqual({
      resolved: false,
    });
    expect(resolveScopeFromRows([], CONTEXT, PERIOD)).toEqual({
      resolved: false,
    });
  });

  it('TC-SCOPE-05: a rule whose effective_end_date is in the past is excluded', () => {
    const rows = [
      row(
        ScopeType.EMPLOYEE_TYPE,
        'type-1',
        'expired',
        '2025-01-01',
        '2025-12-31',
      ),
    ];
    // For the current period it is excluded -> unresolved.
    expect(resolveScopeFromRows(rows, CONTEXT, PERIOD)).toEqual({
      resolved: false,
    });
    // Within its own window it resolves.
    const within = resolveScopeFromRows(rows, CONTEXT, '2025-06-01');
    expect(within.resolved && within.record.tag).toBe('expired');
  });

  it('TC-SCOPE-06: two rules at the same level -> the one active for the period wins (not most-recently-created)', () => {
    // Two employee_type rules with non-overlapping windows. The one whose window
    // contains PERIOD must win regardless of array order.
    const rows = [
      row(ScopeType.EMPLOYEE_TYPE, 'type-1', 'new', '2026-06-01', null),
      row(ScopeType.EMPLOYEE_TYPE, 'type-1', 'old', '2025-01-01', '2026-05-31'),
    ];
    const forJuly = resolveScopeFromRows(rows, CONTEXT, PERIOD);
    expect(forJuly.resolved && forJuly.record.tag).toBe('new');

    const forMarch = resolveScopeFromRows(rows, CONTEXT, '2026-03-01');
    expect(forMarch.resolved && forMarch.record.tag).toBe('old');
  });

  it('TC-SCOPE-06 (overlap tiebreak): if two rules are both active, latest effective_start_date wins', () => {
    const rows = [
      row(ScopeType.EMPLOYEE_TYPE, 'type-1', 'older', '2026-01-01', null),
      row(ScopeType.EMPLOYEE_TYPE, 'type-1', 'newer', '2026-05-01', null),
    ];
    const result = resolveScopeFromRows(rows, CONTEXT, PERIOD);
    expect(result.resolved && result.record.tag).toBe('newer');
  });

  it('full priority chain: employee > division > department > position > employee_type', () => {
    const rows = [
      row(ScopeType.EMPLOYEE_TYPE, 'type-1', 'type'),
      row(ScopeType.POSITION, 'pos-1', 'position'),
      row(ScopeType.DEPARTMENT, 'dep-1', 'department'),
      row(ScopeType.DIVISION, 'div-1', 'division'),
      row(ScopeType.EMPLOYEE, 'emp-1', 'employee'),
    ];
    expect(resolveScopeFromRows(rows, CONTEXT, PERIOD).resolved).toBe(true);
    expect(
      (
        resolveScopeFromRows(rows, CONTEXT, PERIOD) as {
          record: { tag: string };
        }
      ).record.tag,
    ).toBe('employee');

    // Remove employee + division -> department should now win.
    const withoutTop = rows.filter(
      (r) =>
        r.scopeType !== ScopeType.EMPLOYEE &&
        r.scopeType !== ScopeType.DIVISION,
    );
    expect(
      (
        resolveScopeFromRows(withoutTop, CONTEXT, PERIOD) as {
          record: { tag: string };
        }
      ).record.tag,
    ).toBe('department');
  });
});
