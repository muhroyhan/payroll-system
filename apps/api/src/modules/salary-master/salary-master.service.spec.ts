import { ConflictException, NotFoundException } from '@nestjs/common';
import { ScopeType } from '@payroll-system/shared-types';
import { SalaryMasterService } from './salary-master.service';

describe('SalaryMasterService', () => {
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
    const service = new SalaryMasterService(
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
      id: 'sm-1',
      scopeType: ScopeType.DEPARTMENT,
      scopeValue: 'dept-1',
      baseSalary: '5000000.00',
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

  it('update() allows changing baseSalary/scope/effective dates when unreferenced', async () => {
    const { service, payslipReferenceChecker } = makeService(record(), false);

    const updated = await service.update('sm-1', {
      baseSalary: '6000000.00',
      effectiveEndDate: '2026-12-31',
    });

    expect(payslipReferenceChecker.isReferencedByPayslip).toHaveBeenCalledWith(
      'salary_master',
      'sm-1',
    );
    expect(updated.baseSalary).toBe('6000000.00');
  });

  it('update() rejects changing baseSalary once resolved into a payslip line item', async () => {
    const { service } = makeService(record(), true);

    await expect(
      service.update('sm-1', { baseSalary: '7000000.00' }),
    ).rejects.toThrow(ConflictException);
  });

  it.each([
    ['scopeType', { scopeType: ScopeType.DIVISION }],
    ['scopeValue', { scopeValue: 'dept-2' }],
    ['baseSalary', { baseSalary: '1.00' }],
    ['effectiveStartDate', { effectiveStartDate: '2026-02-01' }],
    ['effectiveEndDate', { effectiveEndDate: '2026-03-01' }],
  ])(
    'update() rejects changing %s once referenced by a payslip line item (§11/P8-T07 lock)',
    async (_fieldName, patch) => {
      const { service } = makeService(record(), true);

      await expect(service.update('sm-1', patch)).rejects.toThrow(
        ConflictException,
      );
    },
  );

  it('update() does not query the reference checker when no locked field is touched', async () => {
    const { service, payslipReferenceChecker } = makeService(record(), true);

    // UpdateSalaryMasterDto only has locked fields today, but the guard must
    // stay a no-op on an empty patch regardless (mirrors PayslipComponents).
    await service.update('sm-1', {});

    expect(payslipReferenceChecker.isReferencedByPayslip).not.toHaveBeenCalled();
  });
});
