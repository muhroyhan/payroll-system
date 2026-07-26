import { ConflictException, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { PtkpStatus, TerCategory } from '@payroll-system/shared-types';
import { TerBracketMasterService } from './ter-bracket-master.service';
import { closeOverlappingPredecessor } from '../../../common/effective-dating/close-overlapping-predecessor';

jest.mock('../../../common/effective-dating/close-overlapping-predecessor');

const { closeOverlappingPredecessor: realCloseOverlappingPredecessor } =
  jest.requireActual(
    '../../../common/effective-dating/close-overlapping-predecessor',
  );

describe('TerBracketMasterService', () => {
  const mockedCloseOverlappingPredecessor =
    closeOverlappingPredecessor as jest.Mock;

  beforeEach(() => {
    mockedCloseOverlappingPredecessor.mockReset();
    mockedCloseOverlappingPredecessor.mockResolvedValue(undefined);
  });

  function makeService(existingRecord: any = null, referenced = false) {
    const sequelize = {
      transaction: jest.fn((fn: (t: unknown) => unknown) => fn('txn-1')),
    };
    const model = {
      findAll: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(existingRecord),
      create: jest.fn().mockResolvedValue({ id: 'new-id' }),
    };
    const effectiveRangePayslipChecker = {
      isReferenced: jest.fn().mockResolvedValue(referenced),
    };
    const service = new TerBracketMasterService(
      sequelize as any,
      model as any,
      effectiveRangePayslipChecker as any,
    );
    return { service, sequelize, model, effectiveRangePayslipChecker };
  }

  function record(overrides: Partial<any> = {}) {
    return {
      id: 'ter-1',
      terCategory: TerCategory.A, // TK/0, TK/1, K/0 map here
      incomeLowerBound: '0.00',
      incomeUpperBound: '5000000.00',
      rate: '0.00',
      effectiveStartDate: '2026-01-01',
      effectiveEndDate: null,
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
      ...overrides,
    };
  }

  it('findByIdOrThrow throws NotFoundException when no record exists', async () => {
    const { service } = makeService(null);
    await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('create()', () => {
    it('runs inside a transaction and keys the overlap check on the FULL bracket identity (terCategory + both bounds), not terCategory alone', async () => {
      const { service, sequelize, model } = makeService();

      const dto = {
        terCategory: TerCategory.A,
        incomeLowerBound: '0.00',
        incomeUpperBound: '5000000.00',
        rate: '0.00',
        effectiveStartDate: '2026-01-01',
      };
      await service.create(dto as any, 'user-1');

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(mockedCloseOverlappingPredecessor).toHaveBeenCalledWith(
        model,
        {
          terCategory: TerCategory.A,
          incomeLowerBound: '0.00',
          incomeUpperBound: '5000000.00',
        },
        '2026-01-01',
        'txn-1',
      );
      expect(model.create).toHaveBeenCalledWith(
        { ...dto, createdBy: 'user-1' },
        { transaction: 'txn-1' },
      );
    });

    it('passes null for incomeUpperBound when the new row is the open-ended top bracket', async () => {
      const { service, model } = makeService();

      await service.create(
        {
          terCategory: TerCategory.C,
          incomeLowerBound: '20000000.00',
          rate: '0.34',
          effectiveStartDate: '2026-01-01',
        } as any,
        'user-1',
      );

      expect(mockedCloseOverlappingPredecessor).toHaveBeenCalledWith(
        model,
        {
          terCategory: TerCategory.C,
          incomeLowerBound: '20000000.00',
          incomeUpperBound: null,
        },
        '2026-01-01',
        'txn-1',
      );
    });

    it('propagates the ConflictException from closeOverlappingPredecessor without creating a row', async () => {
      mockedCloseOverlappingPredecessor.mockRejectedValue(
        new ConflictException('ambiguous overlap'),
      );
      const { service, model } = makeService();

      await expect(
        service.create(
          {
            terCategory: TerCategory.A,
            incomeLowerBound: '0.00',
            incomeUpperBound: '5000000.00',
            rate: '0.00',
            effectiveStartDate: '2026-01-01',
          } as any,
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });

    // Proves the actual claim, against the REAL closeOverlappingPredecessor
    // (not the mock above) run through a fake model that filters findAll()
    // by its `where` clause the way MySQL would — a bracket in the SAME
    // terCategory but a DIFFERENT income range must NOT be touched, while the
    // one matching all three identity fields gets closed.
    it('does not auto-close a different-income-range bracket in the same terCategory; only the exact-match predecessor closes', async () => {
      mockedCloseOverlappingPredecessor.mockImplementation(
        realCloseOverlappingPredecessor,
      );

      const sameRangePredecessor = {
        id: 'ter-old-same-range',
        terCategory: TerCategory.A,
        incomeLowerBound: '0.00',
        incomeUpperBound: '5000000.00',
        effectiveStartDate: '2025-01-01',
        effectiveEndDate: null,
        update: jest.fn().mockImplementation(function (this: any, patch: any) {
          Object.assign(this, patch);
          return Promise.resolve(this);
        }),
      };
      const differentRangeBracket = {
        id: 'ter-unrelated-range',
        terCategory: TerCategory.A,
        incomeLowerBound: '5000000.00',
        incomeUpperBound: null, // the open-ended top bracket for category A
        effectiveStartDate: '2025-01-01',
        effectiveEndDate: null,
        update: jest.fn(),
      };
      const allRows = [sameRangePredecessor, differentRangeBracket];

      const sequelize = {
        transaction: jest.fn((fn: (t: unknown) => unknown) => fn('txn-1')),
      };
      const model = {
        findAll: jest.fn(async ({ where }: any) => {
          const matchesField = (actual: unknown, expected: unknown) => {
            if (
              expected !== null &&
              typeof expected === 'object' &&
              Op.is in (expected as object)
            ) {
              return actual === null;
            }
            return actual === expected;
          };
          return allRows.filter((row) =>
            Object.entries(where).every(([key, expected]) =>
              matchesField((row as any)[key], expected),
            ),
          );
        }),
        create: jest.fn().mockResolvedValue({ id: 'new-id' }),
      };
      const effectiveRangePayslipChecker = { isReferenced: jest.fn() };
      const service = new TerBracketMasterService(
        sequelize as any,
        model as any,
        effectiveRangePayslipChecker as any,
      );

      await service.create(
        {
          terCategory: TerCategory.A,
          incomeLowerBound: '0.00',
          incomeUpperBound: '5000000.00',
          rate: '0.10',
          effectiveStartDate: '2026-01-01',
        } as any,
        'user-1',
      );

      // The exact-match predecessor (same category + same bounds) is closed.
      expect(sameRangePredecessor.update).toHaveBeenCalledWith(
        { effectiveEndDate: '2025-12-31' },
        { transaction: 'txn-1' },
      );
      // The different-income-range bracket in the SAME category must coexist
      // untouched — it was never a candidate at all.
      expect(differentRangeBracket.update).not.toHaveBeenCalled();
      expect(differentRangeBracket.effectiveEndDate).toBeNull();
    });
  });

  it('update() allows changing bounds/rate/effective dates when unreferenced', async () => {
    const { service, effectiveRangePayslipChecker } = makeService(record(), false);

    const updated = await service.update('ter-1', { rate: '0.005' });

    expect(effectiveRangePayslipChecker.isReferenced).toHaveBeenCalledWith(
      { effectiveStartDate: '2026-01-01', effectiveEndDate: null },
      expect.any(Function),
    );
    expect(updated.rate).toBe('0.005');
  });

  it("passes a category matcher that re-derives TER category from the employee's ptkpStatus", async () => {
    const { service, effectiveRangePayslipChecker } = makeService(record(), false);

    await service.update('ter-1', { rate: '0.005' });

    const [, matcher] = effectiveRangePayslipChecker.isReferenced.mock.calls[0];
    // TK/0 -> category A (matches this row); K/1 -> category B (does not).
    expect(matcher({ ptkpStatus: PtkpStatus.TK_0 })).toBe(true);
    expect(matcher({ ptkpStatus: PtkpStatus.K_1 })).toBe(false);
  });

  it.each([
    ['terCategory', { terCategory: TerCategory.B }],
    ['incomeLowerBound', { incomeLowerBound: '1.00' }],
    ['incomeUpperBound', { incomeUpperBound: '6000000.00' }],
    ['rate', { rate: '0.01' }],
    ['effectiveStartDate', { effectiveStartDate: '2026-02-01' }],
  ])(
    'update() rejects changing %s once a payslip exists for a covered period/category (§11/P8-T07 lock)',
    async (_fieldName, patch) => {
      const { service } = makeService(record(), true);

      await expect(service.update('ter-1', patch)).rejects.toThrow(
        ConflictException,
      );
    },
  );

  // Audit follow-up: effectiveEndDate must stay editable even when the row
  // is referenced — closing a row's range never changes a historical
  // calculation, and blocking it would make an already-overlapping row
  // permanently un-fixable.
  it('update() allows changing effectiveEndDate even when the row IS referenced (not a dead-lock)', async () => {
    const { service, effectiveRangePayslipChecker } = makeService(record(), true);

    const updated = await service.update('ter-1', {
      effectiveEndDate: '2026-03-01',
    });

    expect(effectiveRangePayslipChecker.isReferenced).not.toHaveBeenCalled();
    expect(updated.effectiveEndDate).toBe('2026-03-01');
  });

  it('update() does not query the checker when no locked field is touched', async () => {
    const { service, effectiveRangePayslipChecker } = makeService(record(), true);

    await service.update('ter-1', {});

    expect(effectiveRangePayslipChecker.isReferenced).not.toHaveBeenCalled();
  });
});
