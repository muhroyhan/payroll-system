import type { Model } from 'sequelize';
import {
  PtkpStatus,
  ScopeType,
  TerCategory,
} from '@payroll-system/shared-types';
import { resolveScopeFromRows } from './scope-selection';
import {
  ScopeContext,
  ScopedEffectiveRecord,
  ScopeResolution,
} from './scope-resolver.types';
import { PerRunScopeCache } from './per-run-scope-cache';
import { calculateMonthlyPph21 } from '../payroll-calculation/pph21-monthly.core';
import { TerBracketRow } from '../tax-bpjs-constants/ter-bracket-master/ter-lookup';

const PERIOD = '2026-07-15';

// A salary_master-shaped row. baseSalary distinguishes which rule won.
interface SalaryRow extends ScopedEffectiveRecord {
  baseSalary: number;
}

function row(
  scopeType: ScopeType,
  scopeValue: string,
  baseSalary: number,
): SalaryRow {
  return {
    scopeType,
    scopeValue,
    baseSalary,
    effectiveStartDate: '2026-01-01',
    effectiveEndDate: null,
  };
}

// Same org combination for A/B/C; only employeeId differs.
function ctx(employeeId: string): ScopeContext {
  return {
    employeeId,
    divisionId: 'div-1',
    departmentId: 'dept-1',
    positionId: 'pos-1',
    employeeTypeId: 'type-1',
  };
}

// A fake model whose findAll returns the given rows once; we count the calls to
// prove the snapshot is fetched once per run, not per employee.
function fakeModel(rows: SalaryRow[]) {
  return { findAll: jest.fn().mockResolvedValue(rows) };
}

function salaryOf(res: ScopeResolution<SalaryRow>): number {
  if (!res.resolved) {
    throw new Error('expected a resolved rule');
  }
  return res.record.baseSalary;
}

describe('PerRunScopeCache (P8-T03)', () => {
  it('fetches the master snapshot ONCE per run, not once per employee', async () => {
    const model = fakeModel([row(ScopeType.DIVISION, 'div-1', 8_000_000)]);
    const cache = new PerRunScopeCache(PERIOD);

    await cache.resolve<SalaryRow & Model>(model as never, ctx('emp-A'));
    await cache.resolve<SalaryRow & Model>(model as never, ctx('emp-B'));
    await cache.resolve<SalaryRow & Model>(model as never, ctx('emp-C'));

    expect(model.findAll).toHaveBeenCalledTimes(1);
  });

  it('gives byte-identical results to the un-cached resolver (cache ON == cache OFF)', async () => {
    const rows = [
      row(ScopeType.DIVISION, 'div-1', 8_000_000),
      row(ScopeType.EMPLOYEE, 'emp-B', 12_000_000), // override for B
    ];
    const model = fakeModel(rows);
    const cache = new PerRunScopeCache(PERIOD);

    for (const id of ['emp-A', 'emp-B', 'emp-C']) {
      const cached = await cache.resolve<SalaryRow & Model>(model as never, ctx(id));
      const direct = resolveScopeFromRows(rows, ctx(id), PERIOD);
      expect(cached).toEqual(direct);
    }
  });

  // TC-PAYROLL-08 — same org, but B has an employee-level override. The memo
  // must NOT collapse them onto one value.
  it('TC-PAYROLL-08: never collapses distinct employee-level overrides', async () => {
    const rows = [
      row(ScopeType.DIVISION, 'div-1', 8_000_000), // org-level for everyone
      row(ScopeType.EMPLOYEE, 'emp-B', 12_000_000), // B-only override
    ];
    const model = fakeModel(rows);
    const cache = new PerRunScopeCache(PERIOD);

    const a = await cache.resolve<SalaryRow & Model>(model as never, ctx('emp-A'));
    const b = await cache.resolve<SalaryRow & Model>(model as never, ctx('emp-B'));
    const c = await cache.resolve<SalaryRow & Model>(model as never, ctx('emp-C'));

    expect(a).toMatchObject({
      resolved: true,
      matchedScopeType: ScopeType.DIVISION,
    });
    expect(salaryOf(a)).toBe(8_000_000);
    // B keeps its own override despite sharing A/C's org combination.
    expect(b).toMatchObject({
      resolved: true,
      matchedScopeType: ScopeType.EMPLOYEE,
    });
    expect(salaryOf(b)).toBe(12_000_000);
    // C is a genuine cache hit off A's org-level result.
    expect(salaryOf(c)).toBe(8_000_000);
  });

  it('returns { resolved: false } (memoized) when no rule matches, same as direct', async () => {
    const rows = [row(ScopeType.DIVISION, 'other-div', 5_000_000)];
    const model = fakeModel(rows);
    const cache = new PerRunScopeCache(PERIOD);

    const cached = await cache.resolve<SalaryRow & Model>(model as never, ctx('emp-A'));
    expect(cached).toEqual({ resolved: false });
    expect(cached).toEqual(resolveScopeFromRows(rows, ctx('emp-A'), PERIOD));
  });

  it('two caches (different runs/periods) do not share state', async () => {
    const july = fakeModel([row(ScopeType.DIVISION, 'div-1', 8_000_000)]);
    const august = fakeModel([row(ScopeType.DIVISION, 'div-1', 9_500_000)]);
    const julyCache = new PerRunScopeCache('2026-07-15');
    const augustCache = new PerRunScopeCache('2026-08-15');

    const j = await julyCache.resolve<SalaryRow & Model>(july as never, ctx('emp-A'));
    const a = await augustCache.resolve<SalaryRow & Model>(
      august as never,
      ctx('emp-A'),
    );

    expect(salaryOf(j)).toBe(8_000_000);
    expect(salaryOf(a)).toBe(9_500_000);
    expect(july.findAll).toHaveBeenCalledTimes(1);
    expect(august.findAll).toHaveBeenCalledTimes(1);
  });

  // Ties the optimization to the P7 worked examples: a resolved base salary fed
  // into the tax calc yields the SAME PPh21 whether resolved via the cache or
  // directly. WE-01/02/03 use bruto 8M / 13M / 20M.
  describe('result-neutral for WE-01/02/03 (resolved salary → PPh21 unchanged)', () => {
    const BRACKETS: TerBracketRow[] = [
      {
        terCategory: TerCategory.A,
        incomeLowerBound: '7500001',
        incomeUpperBound: '8550000',
        rate: '0.01500',
      },
      {
        terCategory: TerCategory.B,
        incomeLowerBound: '12600001',
        incomeUpperBound: '13600000',
        rate: '0.04000',
      },
      {
        terCategory: TerCategory.C,
        incomeLowerBound: '19500001',
        incomeUpperBound: '22700000',
        rate: '0.08000',
      },
    ];

    const cases: Array<[string, number, PtkpStatus, number]> = [
      ['WE-01', 8_000_000, PtkpStatus.TK_0, 120_000],
      ['WE-02', 13_000_000, PtkpStatus.K_2, 520_000],
      ['WE-03', 20_000_000, PtkpStatus.K_3, 1_600_000],
    ];

    it.each(cases)(
      '%s: cached and direct resolution both yield the same PPh21',
      async (_label, salary, ptkp, expectedPph21) => {
        const rows = [row(ScopeType.DIVISION, 'div-1', salary)];
        const model = fakeModel(rows);
        const cache = new PerRunScopeCache(PERIOD);

        const cached = await cache.resolve<SalaryRow & Model>(
          model as never,
          ctx('emp-A'),
        );
        const direct = resolveScopeFromRows(rows, ctx('emp-A'), PERIOD);

        const brutoCached = salaryOf(cached);
        const brutoDirect = salaryOf(direct);
        expect(brutoCached).toBe(brutoDirect);

        const pph21Cached = calculateMonthlyPph21({
          taxableBruto: brutoCached,
          ptkpStatus: ptkp,
          brackets: BRACKETS,
        });
        const pph21Direct = calculateMonthlyPph21({
          taxableBruto: brutoDirect,
          ptkpStatus: ptkp,
          brackets: BRACKETS,
        });
        expect(pph21Cached.pph21).toBe(pph21Direct.pph21);
        expect(pph21Cached.pph21).toBe(expectedPph21);
      },
    );
  });
});
