import { ConflictException, NotFoundException } from '@nestjs/common';
import { PayslipComponentType } from '@payroll-system/shared-types';
import { PayslipComponentsService } from './payslip-components.service';

describe('PayslipComponentsService', () => {
  function makeService(existingRecord: any = null, referencedCount = 0) {
    const model = {
      findAll: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(existingRecord),
      create: jest.fn().mockResolvedValue({ id: 'new-id' }),
    };
    const lineItemModel = {
      count: jest.fn().mockResolvedValue(referencedCount),
    };
    const service = new PayslipComponentsService(
      model as any,
      lineItemModel as any,
    );
    return { service, model, lineItemModel };
  }

  function record(overrides: Partial<any> = {}) {
    return {
      id: 'pc-1',
      name: 'Tunjangan Transport',
      componentType: PayslipComponentType.EARNING,
      isTaxable: true,
      isBpjsEligible: true,
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

  it('update() allows changing componentType/isTaxable/isBpjsEligible when unreferenced', async () => {
    const { service, lineItemModel } = makeService(record(), 0);

    const updated = await service.update('pc-1', {
      componentType: PayslipComponentType.DEDUCTION,
      isTaxable: false,
      isBpjsEligible: false,
    });

    expect(lineItemModel.count).toHaveBeenCalledWith({
      where: { componentId: 'pc-1' },
    });
    expect(updated.componentType).toBe(PayslipComponentType.DEDUCTION);
    expect(updated.isTaxable).toBe(false);
    expect(updated.isBpjsEligible).toBe(false);
  });

  it('update() allows changing name alone even when referenced (name is not locked)', async () => {
    const { service, lineItemModel } = makeService(record(), 1);

    const updated = await service.update('pc-1', { name: 'Tunjangan Transport (baru)' });

    // Only queries payslip_line_items when a locked field is actually touched.
    expect(lineItemModel.count).not.toHaveBeenCalled();
    expect(updated.name).toBe('Tunjangan Transport (baru)');
  });

  it.each([
    ['componentType', { componentType: PayslipComponentType.DEDUCTION }],
    ['isTaxable', { isTaxable: false }],
    ['isBpjsEligible', { isBpjsEligible: false }],
  ])(
    'update() rejects changing %s once referenced by a payslip line item (§11/P8-T07 lock)',
    async (_fieldName, patch) => {
      const { service } = makeService(record(), 1);

      await expect(service.update('pc-1', patch)).rejects.toThrow(
        ConflictException,
      );
    },
  );

  it('update() rejects a mixed patch (name + a locked field) once referenced', async () => {
    const { service } = makeService(record(), 1);

    await expect(
      service.update('pc-1', { name: 'Renamed', isTaxable: false }),
    ).rejects.toThrow(ConflictException);
  });
});
