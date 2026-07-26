import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ScopeType } from '@payroll-system/shared-types';
import { IncentiveMasterService } from './incentive-master.service';

describe('IncentiveMasterService', () => {
  function makeService(existingRecord: any = null, referenced = false) {
    const model = {
      findAll: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(existingRecord),
      create: jest.fn().mockResolvedValue({ id: 'new-id' }),
    };
    const scopeResolver = { resolve: jest.fn() };
    const scopeValueValidator = { validate: jest.fn().mockResolvedValue(undefined) };
    const employeesService = { getScopeContext: jest.fn() };
    const payslipReferenceChecker = {
      isReferencedByPayslip: jest.fn().mockResolvedValue(referenced),
    };
    const service = new IncentiveMasterService(
      model as any,
      scopeResolver as any,
      scopeValueValidator as any,
      employeesService as any,
      payslipReferenceChecker as any,
    );
    return { service, model, scopeResolver, scopeValueValidator, payslipReferenceChecker };
  }

  function record(overrides: Partial<any> = {}) {
    return {
      id: 'im-1',
      scopeType: ScopeType.DEPARTMENT,
      scopeValue: 'dept-1',
      incentiveAmount: '500000.00',
      isBpjsEligible: true,
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

  it('update() allows changing incentiveAmount/scope/effective dates when unreferenced', async () => {
    const { service, payslipReferenceChecker } = makeService(record(), false);

    const updated = await service.update(
      'im-1',
      { incentiveAmount: '750000.00' },
      'user-1',
    );

    expect(payslipReferenceChecker.isReferencedByPayslip).toHaveBeenCalledWith(
      'incentive_master',
      'im-1',
    );
    expect(updated.incentiveAmount).toBe('750000.00');
    expect(updated.updatedBy).toBe('user-1');
  });

  it('update() rejects a manual retire (effectiveEndDate null -> set) with no reason', async () => {
    const { service } = makeService(record(), false);

    await expect(
      service.update('im-1', { effectiveEndDate: '2026-12-31' }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([
    ['scopeType', { scopeType: ScopeType.DIVISION }],
    ['scopeValue', { scopeValue: 'dept-2' }],
    ['incentiveAmount', { incentiveAmount: '1.00' }],
    ['isBpjsEligible', { isBpjsEligible: false }],
    ['effectiveStartDate', { effectiveStartDate: '2026-02-01' }],
    ['effectiveEndDate', { effectiveEndDate: '2026-03-01' }],
  ])(
    'update() rejects changing %s once referenced by a payslip line item (§11/P8-T07 lock)',
    async (_fieldName, patch) => {
      const { service } = makeService(record(), true);

      await expect(service.update('im-1', patch, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    },
  );

  it('update() does not query the reference checker when no locked field is touched', async () => {
    const { service, payslipReferenceChecker } = makeService(record(), true);

    await service.update('im-1', {}, 'user-1');

    expect(payslipReferenceChecker.isReferencedByPayslip).not.toHaveBeenCalled();
  });
});
