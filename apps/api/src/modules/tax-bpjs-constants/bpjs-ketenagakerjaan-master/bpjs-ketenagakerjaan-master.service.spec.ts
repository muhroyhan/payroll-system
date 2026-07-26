import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { BpjsKetenagakerjaanMasterService } from './bpjs-ketenagakerjaan-master.service';
import { closeOverlappingPredecessor } from '../../../common/effective-dating/close-overlapping-predecessor';

jest.mock('../../../common/effective-dating/close-overlapping-predecessor');

describe('BpjsKetenagakerjaanMasterService', () => {
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
    const service = new BpjsKetenagakerjaanMasterService(
      sequelize as any,
      model as any,
      effectiveRangePayslipChecker as any,
    );
    return { service, sequelize, model, effectiveRangePayslipChecker };
  }

  function record(overrides: Partial<any> = {}) {
    return {
      id: 'bt-1',
      jhtEmployeeRate: '0.02',
      jhtCompanyRate: '0.037',
      jpEmployeeRate: '0.01',
      jpCompanyRate: '0.02',
      jpWageCap: '10000000.00',
      jkkCompanyRate: '0.0024',
      jkmCompanyRate: '0.003',
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
    it('runs inside a transaction, closes any open predecessor (no category filter), then inserts the new row', async () => {
      const { service, sequelize, model } = makeService();

      const dto = {
        jhtEmployeeRate: '0.02',
        jhtCompanyRate: '0.037',
        jpEmployeeRate: '0.01',
        jpCompanyRate: '0.02',
        jpWageCap: '11000000.00',
        jkkCompanyRate: '0.0024',
        jkmCompanyRate: '0.003',
        effectiveStartDate: '2026-01-01',
      };
      await service.create(dto as any, 'user-1', Role.ADMIN);

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(mockedCloseOverlappingPredecessor).toHaveBeenCalledWith(
        model,
        {},
        '2026-01-01',
        'txn-1',
        expect.any(String),
        'user-1',
        Role.ADMIN,
      );
      const [, , , , newRowId] =
        mockedCloseOverlappingPredecessor.mock.calls[0];
      expect(model.create).toHaveBeenCalledWith(
        { id: newRowId, ...dto, createdBy: 'user-1' },
        expect.objectContaining({
          transaction: 'txn-1',
          actorId: 'user-1',
          actorRole: Role.ADMIN,
        }),
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
            jhtEmployeeRate: '0.02',
            jhtCompanyRate: '0.037',
            jpEmployeeRate: '0.01',
            jpCompanyRate: '0.02',
            jpWageCap: '1.00',
            jkkCompanyRate: '0.0024',
            jkmCompanyRate: '0.003',
            effectiveStartDate: '2026-01-01',
          } as any,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('allows changing rates/cap/effectiveStartDate when unreferenced', async () => {
      const { service, effectiveRangePayslipChecker } = makeService(record(), false);

      const updated = await service.update(
        'bt-1',
        { jpWageCap: '11000000.00' },
        'user-1',
        Role.ADMIN,
      );

      expect(effectiveRangePayslipChecker.isReferenced).toHaveBeenCalledWith({
        effectiveStartDate: '2026-01-01',
        effectiveEndDate: null,
      });
      expect(updated.jpWageCap).toBe('11000000.00');
      expect(updated.updatedBy).toBe('user-1');
    });

    it.each([
      ['jhtEmployeeRate', { jhtEmployeeRate: '0.03' }],
      ['jhtCompanyRate', { jhtCompanyRate: '0.04' }],
      ['jpEmployeeRate', { jpEmployeeRate: '0.02' }],
      ['jpCompanyRate', { jpCompanyRate: '0.03' }],
      ['jpWageCap', { jpWageCap: '1.00' }],
      ['jkkCompanyRate', { jkkCompanyRate: '0.005' }],
      ['jkmCompanyRate', { jkmCompanyRate: '0.004' }],
      ['effectiveStartDate', { effectiveStartDate: '2026-02-01' }],
    ])(
      'rejects changing %s once a payslip exists for a covered period (§11/P8-T07 lock)',
      async (_fieldName, patch) => {
        const { service } = makeService(record(), true);

        await expect(
          service.update('bt-1', patch, 'user-1', Role.ADMIN),
        ).rejects.toThrow(ConflictException);
      },
    );

    it('allows changing effectiveEndDate even when the row IS referenced (not a dead-lock), given a reason', async () => {
      const { service, effectiveRangePayslipChecker } = makeService(record(), true);

      const updated = await service.update(
        'bt-1',
        { effectiveEndDate: '2026-12-31', reason: 'Superseded by new rate' },
        'user-1',
        Role.ADMIN,
      );

      expect(effectiveRangePayslipChecker.isReferenced).not.toHaveBeenCalled();
      expect(updated.effectiveEndDate).toBe('2026-12-31');
    });

    it('rejects a manual retire (effectiveEndDate null -> set) with no reason', async () => {
      const { service } = makeService(record(), false);

      await expect(
        service.update(
          'bt-1',
          { effectiveEndDate: '2026-12-31' },
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not query the checker when no locked field is touched', async () => {
      const { service, effectiveRangePayslipChecker } = makeService(record(), true);

      await service.update('bt-1', {}, 'user-1', Role.ADMIN);

      expect(effectiveRangePayslipChecker.isReferenced).not.toHaveBeenCalled();
    });
  });
});
