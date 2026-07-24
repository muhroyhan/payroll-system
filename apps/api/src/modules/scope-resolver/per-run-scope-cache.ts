import { Model, ModelStatic } from 'sequelize';
import { ScopeType } from '@payroll-system/shared-types';
import {
  isEffectiveOn,
  resolveEffectiveRecords,
} from '../../common/effective-dating/resolve-effective';
import { resolveScopeFromRows } from './scope-selection';
import {
  ScopeContext,
  ScopedEffectiveRecord,
  ScopeResolution,
} from './scope-resolver.types';

// P8-T03 (§01_GENERAL: "Pre-resolve the scope engine once per run, not once per
// employee") — a per-run, throwaway cache over the scope resolver (§5.2).
//
// It does NOT re-implement resolution — every result still comes from the pure
// `resolveScopeFromRows` (§3, one scope-resolution implementation). It adds two
// pure-performance layers:
//   1. SNAPSHOT: fetch every effective master row for the run's period ONCE
//      (one query per master), then resolve each employee in memory.
//   2. MEMO: for employees whose resolution can't depend on their identity,
//      cache the result by their org combination (employee_type/position/
//      department/division).
//
// Correctness (TC-PAYROLL-08): if an employee-level rule targets THIS employee,
// resolution genuinely depends on the individual — that case bypasses the memo
// entirely, so distinct employee-level overrides are never collapsed.
//
// Isolation & staleness:
//   - Created NEW per run (never a shared singleton), so no state leaks between
//     two concurrently-processing runs.
//   - Keyed to one `periodDate` and snapshotted once, so the whole run resolves
//     against a single consistent set of effective-dated constants — a mid-run
//     edit to a master can't make employee #200 use different numbers than
//     employee #1.
export class PerRunScopeCache {
  private readonly snapshots = new Map<
    ModelStatic<Model>,
    ScopedEffectiveRecord[]
  >();
  private readonly memos = new Map<
    ModelStatic<Model>,
    Map<string, ScopeResolution<Model>>
  >();

  constructor(private readonly periodDate: string) {}

  async resolve<M extends Model & ScopedEffectiveRecord>(
    model: ModelStatic<M>,
    context: ScopeContext,
  ): Promise<ScopeResolution<M>> {
    const rows = await this.snapshot(model);

    // Employee-level override present for this employee → resolution depends on
    // the individual; resolve directly, never touching the org-keyed memo.
    const hasEmployeeOverride = rows.some(
      (row) =>
        row.scopeType === ScopeType.EMPLOYEE &&
        row.scopeValue === context.employeeId &&
        isEffectiveOn(row, this.periodDate),
    );
    if (hasEmployeeOverride) {
      return resolveScopeFromRows(rows as M[], context, this.periodDate);
    }

    const orgKey = this.orgKey(context);
    const memo = this.getMemo(model);
    const cached = memo.get(orgKey);
    if (cached) {
      return cached as ScopeResolution<M>;
    }
    const resolved = resolveScopeFromRows(
      rows as M[],
      context,
      this.periodDate,
    );
    memo.set(orgKey, resolved);
    return resolved;
  }

  private async snapshot<M extends Model & ScopedEffectiveRecord>(
    model: ModelStatic<M>,
  ): Promise<ScopedEffectiveRecord[]> {
    const key = model as ModelStatic<Model>;
    const existing = this.snapshots.get(key);
    if (existing) {
      return existing;
    }
    const rows = await resolveEffectiveRecords(model, this.periodDate);
    this.snapshots.set(key, rows);
    return rows;
  }

  private getMemo(
    model: ModelStatic<Model>,
  ): Map<string, ScopeResolution<Model>> {
    let memo = this.memos.get(model);
    if (!memo) {
      memo = new Map();
      this.memos.set(model, memo);
    }
    return memo;
  }

  // The org combination — everything the resolution can depend on OTHER than
  // the individual employee. Two employees sharing this key (and with no
  // employee-level override) resolve identically.
  private orgKey(context: ScopeContext): string {
    return [
      context.employeeTypeId,
      context.positionId,
      context.departmentId,
      context.divisionId,
    ].join('|');
  }
}
