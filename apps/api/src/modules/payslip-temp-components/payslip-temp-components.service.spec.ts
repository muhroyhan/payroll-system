import { NotFoundException } from '@nestjs/common';
import { ScopeType } from '@payroll-system/shared-types';
import { PayslipTempComponentsService } from './payslip-temp-components.service';

describe('PayslipTempComponentsService', () => {
  function makeService(existingRecord: any = null) {
    const model = {
      findAll: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(existingRecord),
      create: jest
        .fn()
        .mockImplementation((data: any) => Promise.resolve(data)),
    };
    const scopeResolver = { resolve: jest.fn() };
    const scopeValueValidator = {
      validate: jest.fn().mockResolvedValue(undefined),
    };
    const employeesService = {
      getScopeContext: jest.fn().mockResolvedValue({
        employeeId: 'emp-1',
        divisionId: 'div-1',
        departmentId: 'dept-1',
        positionId: 'pos-1',
        employeeTypeId: 'type-1',
      }),
    };
    const service = new PayslipTempComponentsService(
      model as any,
      scopeResolver,
      scopeValueValidator as any,
      employeesService as any,
    );
    return {
      service,
      model,
      scopeResolver,
      scopeValueValidator,
      employeesService,
    };
  }

  function record(overrides: Partial<any> = {}) {
    return {
      id: 'tc-1',
      componentId: 'comp-1',
      scopeType: ScopeType.EMPLOYEE,
      scopeValue: 'emp-1',
      amount: '500000.00',
      periodYear: 2026,
      periodMonth: 7,
      effectiveStartDate: '2026-07-01',
      effectiveEndDate: '2026-07-31',
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('findByIdOrThrow throws NotFoundException when no record exists', async () => {
    const { service } = makeService(null);
    await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('create() validates scope_value and derives effectiveStartDate/effectiveEndDate from period_year/period_month', async () => {
    const { service, model, scopeValueValidator } = makeService();

    const result = await service.create(
      {
        componentId: 'comp-1',
        scopeType: ScopeType.DIVISION,
        scopeValue: 'div-1',
        amount: '500000',
        periodYear: 2026,
        periodMonth: 2, // February — leap-year-agnostic edge case (28 days in 2026)
      },
      'creator-1',
    );

    expect(scopeValueValidator.validate).toHaveBeenCalledWith(
      ScopeType.DIVISION,
      'div-1',
    );
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        effectiveStartDate: '2026-02-01',
        effectiveEndDate: '2026-02-28',
        createdBy: 'creator-1',
      }),
    );
    expect(result.effectiveStartDate).toBe('2026-02-01');
    expect(result.effectiveEndDate).toBe('2026-02-28');
  });

  it('create() derives the correct last day for a 31-day month', async () => {
    const { service, model } = makeService();
    await service.create(
      {
        componentId: 'comp-1',
        scopeType: ScopeType.EMPLOYEE,
        scopeValue: 'emp-1',
        amount: '100000',
        periodYear: 2026,
        periodMonth: 1,
      },
      'creator-1',
    );
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        effectiveStartDate: '2026-01-01',
        effectiveEndDate: '2026-01-31',
      }),
    );
  });

  it('update() re-derives the effective range when period_year/period_month change', async () => {
    const r = record();
    const { service, scopeValueValidator } = makeService(r);

    const result = await service.update('tc-1', {
      periodYear: 2026,
      periodMonth: 8,
    });

    expect(scopeValueValidator.validate).not.toHaveBeenCalled();
    expect(result.effectiveStartDate).toBe('2026-08-01');
    expect(result.effectiveEndDate).toBe('2026-08-31');
  });

  it('update() re-validates scope_value only when both scopeType and scopeValue are supplied', async () => {
    const r = record();
    const { service, scopeValueValidator } = makeService(r);

    await service.update('tc-1', {
      scopeType: ScopeType.POSITION,
      scopeValue: 'pos-2',
    });

    expect(scopeValueValidator.validate).toHaveBeenCalledWith(
      ScopeType.POSITION,
      'pos-2',
    );
  });

  it('update() leaves the effective range untouched when period fields are not part of the patch', async () => {
    const r = record();
    const { service } = makeService(r);

    const result = await service.update('tc-1', { amount: '750000' });

    expect(result.effectiveStartDate).toBe('2026-07-01');
    expect(result.effectiveEndDate).toBe('2026-07-31');
    expect(result.amount).toBe('750000');
  });

  it('remove() destroys the record with no immutability guard (documented gap, not assumed)', async () => {
    const r = record();
    const { service } = makeService(r);

    await service.remove('tc-1');

    expect(r.destroy).toHaveBeenCalled();
  });

  // §5.2 — multiple different component_ids can be simultaneously active for
  // the same employee/period (unlike salary/incentive's single-winner
  // resolution); each is resolved independently via the SAME
  // ScopeResolverService, narrowed per component_id.
  it('listActiveForEmployee() resolves each distinct component_id independently via ScopeResolverService', async () => {
    const { service, model, scopeResolver, employeesService } = makeService();
    model.findAll.mockResolvedValue([
      { componentId: 'comp-1' },
      { componentId: 'comp-2' },
    ]);
    scopeResolver.resolve
      .mockResolvedValueOnce({
        resolved: true,
        record: record({ componentId: 'comp-1' }),
        matchedScopeType: ScopeType.EMPLOYEE,
      })
      .mockResolvedValueOnce({ resolved: false });

    const results = await service.listActiveForEmployee('emp-1', '2026-07-15');

    expect(employeesService.getScopeContext).toHaveBeenCalledWith('emp-1');
    expect(scopeResolver.resolve).toHaveBeenCalledTimes(2);
    expect(scopeResolver.resolve).toHaveBeenNthCalledWith(
      1,
      model,
      expect.anything(),
      '2026-07-15',
      { componentId: 'comp-1' },
    );
    expect(results).toHaveLength(1);
    expect(results[0].componentId).toBe('comp-1');
  });
});
