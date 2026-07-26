import { ConflictException, NotFoundException } from '@nestjs/common';
import { PtkpStatus } from '@payroll-system/shared-types';
import { PtkpMasterService } from './ptkp-master.service';
import { closeOverlappingPredecessor } from '../../../common/effective-dating/close-overlapping-predecessor';

jest.mock('../../../common/effective-dating/close-overlapping-predecessor');

describe('PtkpMasterService', () => {
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
    const service = new PtkpMasterService(
      sequelize as any,
      model as any,
      effectiveRangePayslipChecker as any,
    );
    return { service, sequelize, model, effectiveRangePayslipChecker };
  }

  function record(overrides: Partial<any> = {}) {
    return {
      id: 'ptkp-1',
      ptkpStatus: PtkpStatus.TK_0,
      amount: '54000000.00',
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
    it('runs inside a transaction, closes any open predecessor for the same ptkpStatus, then inserts the new row', async () => {
      const { service, sequelize, model } = makeService();

      const dto = {
        ptkpStatus: PtkpStatus.TK_0,
        amount: '58500000.00',
        effectiveStartDate: '2026-01-01',
      };
      await service.create(dto as any, 'user-1');

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(mockedCloseOverlappingPredecessor).toHaveBeenCalledWith(
        model,
        { ptkpStatus: PtkpStatus.TK_0 },
        '2026-01-01',
        'txn-1',
      );
      expect(model.create).toHaveBeenCalledWith(
        { ...dto, createdBy: 'user-1' },
        { transaction: 'txn-1' },
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
            ptkpStatus: PtkpStatus.TK_0,
            amount: '1.00',
            effectiveStartDate: '2026-01-01',
          } as any,
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('allows changing amount/effectiveStartDate when unreferenced', async () => {
      const { service, effectiveRangePayslipChecker } = makeService(record(), false);

      const updated = await service.update('ptkp-1', { amount: '60000000.00' });

      expect(effectiveRangePayslipChecker.isReferenced).toHaveBeenCalledWith(
        { effectiveStartDate: '2026-01-01', effectiveEndDate: null },
        expect.any(Function),
      );
      expect(updated.amount).toBe('60000000.00');
    });

    it("passes a category matcher scoped to this row's own ptkpStatus", async () => {
      const { service, effectiveRangePayslipChecker } = makeService(record(), false);

      await service.update('ptkp-1', { amount: '60000000.00' });

      const [, matcher] = effectiveRangePayslipChecker.isReferenced.mock.calls[0];
      expect(matcher({ ptkpStatus: PtkpStatus.TK_0 })).toBe(true);
      expect(matcher({ ptkpStatus: PtkpStatus.K_1 })).toBe(false);
    });

    it.each([
      ['ptkpStatus', { ptkpStatus: PtkpStatus.K_1 }],
      ['amount', { amount: '1.00' }],
      ['effectiveStartDate', { effectiveStartDate: '2026-02-01' }],
    ])(
      'rejects changing %s once a payslip exists for a covered period/status (§11/P8-T07 lock)',
      async (_fieldName, patch) => {
        const { service } = makeService(record(), true);

        await expect(service.update('ptkp-1', patch)).rejects.toThrow(
          ConflictException,
        );
      },
    );

    // Audit follow-up: effectiveEndDate must stay editable even when the row
    // is referenced — closing a row's range never changes a historical
    // calculation, and blocking it would make an already-overlapping row
    // permanently un-fixable.
    it('allows changing effectiveEndDate even when the row IS referenced (not a dead-lock)', async () => {
      const { service, effectiveRangePayslipChecker } = makeService(record(), true);

      const updated = await service.update('ptkp-1', {
        effectiveEndDate: '2026-12-31',
      });

      expect(effectiveRangePayslipChecker.isReferenced).not.toHaveBeenCalled();
      expect(updated.effectiveEndDate).toBe('2026-12-31');
    });

    it('does not query the checker when no locked field is touched', async () => {
      const { service, effectiveRangePayslipChecker } = makeService(record(), true);

      await service.update('ptkp-1', {});

      expect(effectiveRangePayslipChecker.isReferenced).not.toHaveBeenCalled();
    });
  });
});
