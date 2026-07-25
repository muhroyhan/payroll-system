import { ConflictException, NotFoundException } from '@nestjs/common';
import { UniqueConstraintError } from 'sequelize';
import { KasbonStatus } from '@payroll-system/shared-types';
import { KasbonService } from './kasbon.service';

describe('KasbonService', () => {
  function makeService(
    existingRecord: any = null,
    existingDeduction: any = null,
  ) {
    const model = {
      findAll: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(existingRecord),
      create: jest.fn().mockResolvedValue({
        id: 'new-id',
        status: KasbonStatus.PENDING,
        remainingBalance: null,
      }),
    };
    const deductionModel = {
      findOne: jest.fn().mockResolvedValue(existingDeduction),
      create: jest.fn().mockResolvedValue({ id: 'ded-1' }),
    };
    const service = new KasbonService(model as any, deductionModel as any);
    return { service, model, deductionModel };
  }

  function record(overrides: Partial<any> = {}) {
    return {
      id: 'kb-1',
      amount: '3000000.00',
      status: KasbonStatus.PENDING,
      remainingBalance: null,
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('create() always starts pending with remaining_balance left null', async () => {
    const { service, model } = makeService();
    await service.create({
      employeeId: 'emp-1',
      amount: '3000000',
      requestDate: '2026-07-23',
      installmentCount: 3,
      installmentAmount: '1000000',
    });
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: KasbonStatus.PENDING,
        remainingBalance: null,
      }),
    );
  });

  it('findByIdOrThrow throws NotFoundException when no record exists', async () => {
    const { service } = makeService(null);
    await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  // Core of the user's second question: remaining_balance is only ever set
  // by approve(), never by create().
  it('approve() initializes remaining_balance to amount, not before', async () => {
    const r = record();
    const { service } = makeService(r);

    const result = await service.approve('kb-1', 'approver-1');

    expect(r.update).toHaveBeenCalledWith({
      status: KasbonStatus.APPROVED,
      approvedBy: 'approver-1',
      remainingBalance: '3000000.00',
    });
    expect(result.remainingBalance).toBe('3000000.00');
  });

  it('reject() flips status and leaves remaining_balance null', async () => {
    const r = record();
    const { service } = makeService(r);

    await service.reject('kb-1');

    expect(r.update).toHaveBeenCalledWith({ status: KasbonStatus.REJECTED });
  });

  it('approve()/reject() are rejected on an already-decided kasbon (reused assertPendingStatus)', async () => {
    const r = record({
      status: KasbonStatus.APPROVED,
      remainingBalance: '3000000.00',
    });
    const { service } = makeService(r);

    await expect(service.approve('kb-1', 'approver-2')).rejects.toThrow(
      ConflictException,
    );
    await expect(service.reject('kb-1')).rejects.toThrow(ConflictException);
  });

  it('update()/remove() succeed while pending', async () => {
    const r = record();
    const { service } = makeService(r);

    await service.update('kb-1', { installmentCount: 4 });
    expect(r.update).toHaveBeenCalledWith({ installmentCount: 4 });

    await service.remove('kb-1');
    expect(r.destroy).toHaveBeenCalled();
  });

  // Deliberate deviation, same shape as overtime_letter (P4-T03): an
  // approved-but-undeducted kasbon is still editable — the lock is tied to
  // remaining_balance < amount, not to leaving `pending`.
  it('update()/remove() succeed on an APPROVED kasbon with no deductions yet (remaining_balance === amount)', async () => {
    const r = record({
      status: KasbonStatus.APPROVED,
      remainingBalance: '3000000.00',
    });
    const { service } = makeService(r);

    await service.update('kb-1', { installmentAmount: '1500000' });
    expect(r.update).toHaveBeenCalledWith({ installmentAmount: '1500000' });

    await service.remove('kb-1');
    expect(r.destroy).toHaveBeenCalled();
  });

  // P5-T03 — the lock is FIELD-level, not whole-record: touching any of
  // amount/installmentCount/installmentAmount once a deduction has started
  // is rejected, but remove() has no such granularity (deleting discards
  // those fields regardless), so it stays fully blocked.
  it('update() rejects touching amount/installmentCount/installmentAmount once at least one installment has been deducted (§11/TC-KASBON-04)', async () => {
    const r = record({
      status: KasbonStatus.APPROVED,
      remainingBalance: '2000000.00', // < amount 3000000.00
    });
    const { service } = makeService(r);

    await expect(
      service.update('kb-1', { installmentAmount: '1500000' }),
    ).rejects.toThrow(ConflictException);
    await expect(service.update('kb-1', { amount: '5000000' })).rejects.toThrow(
      ConflictException,
    );
    await expect(
      service.update('kb-1', { installmentCount: 5 }),
    ).rejects.toThrow(ConflictException);
    await expect(service.remove('kb-1')).rejects.toThrow(ConflictException);
  });

  // P5-T03's core case: requestDate isn't one of the three locked fields, so
  // it must stay editable even after deductions have started.
  it('update() still allows editing requestDate once a deduction has started', async () => {
    const r = record({
      status: KasbonStatus.APPROVED,
      remainingBalance: '2000000.00', // < amount 3000000.00
    });
    const { service } = makeService(r);

    await service.update('kb-1', { requestDate: '2026-08-01' });
    expect(r.update).toHaveBeenCalledWith({ requestDate: '2026-08-01' });
  });

  // A dead-end status still blocks update() even when the payload touches
  // no locked field — the field-level check only relaxes the
  // deduction-started lock, not the rejected/paid_off lock.
  it('update() rejects even an unlocked-field-only edit on a REJECTED or PAID_OFF kasbon', async () => {
    const rejected = record({ status: KasbonStatus.REJECTED });
    const { service: serviceA } = makeService(rejected);
    await expect(
      serviceA.update('kb-1', { requestDate: '2026-08-01' }),
    ).rejects.toThrow(ConflictException);

    const paidOff = record({
      status: KasbonStatus.PAID_OFF,
      remainingBalance: '0.00',
    });
    const { service: serviceB } = makeService(paidOff);
    await expect(
      serviceB.update('kb-1', { requestDate: '2026-08-01' }),
    ).rejects.toThrow(ConflictException);
  });

  it('update()/remove() are rejected on a REJECTED kasbon', async () => {
    const r = record({ status: KasbonStatus.REJECTED });
    const { service } = makeService(r);

    await expect(service.update('kb-1', {})).rejects.toThrow(ConflictException);
    await expect(service.remove('kb-1')).rejects.toThrow(ConflictException);
  });

  it('update()/remove() are rejected on a PAID_OFF kasbon', async () => {
    const r = record({
      status: KasbonStatus.PAID_OFF,
      remainingBalance: '0.00',
    });
    const { service } = makeService(r);

    await expect(service.update('kb-1', {})).rejects.toThrow(ConflictException);
    await expect(service.remove('kb-1')).rejects.toThrow(ConflictException);
  });

  describe('deductInstallment (P5-T02)', () => {
    it('deducts one installment and records it against the payroll run', async () => {
      const r = record({
        status: KasbonStatus.APPROVED,
        remainingBalance: '3000000.00',
        installmentAmount: '1000000.00',
      });
      const { service, deductionModel } = makeService(r, null);

      const result = await service.deductInstallment('kb-1', 'run-1');

      expect(deductionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kasbonId: 'kb-1',
          payrollRunId: 'run-1',
          amount: '1000000.00',
        }),
      );
      expect(result.remainingBalance).toBe('2000000.00');
      expect(result.status).toBe(KasbonStatus.APPROVED);
    });

    // TC-KASBON-02 — same run retried/re-triggered must not double-deduct.
    it('TC-KASBON-02: calling deductInstallment twice for the same run is idempotent', async () => {
      const r = record({
        status: KasbonStatus.APPROVED,
        remainingBalance: '3000000.00',
        installmentAmount: '1000000.00',
      });
      const { service, deductionModel } = makeService(r, null);

      await service.deductInstallment('kb-1', 'run-1');
      expect(r.remainingBalance).toBe('2000000.00');

      // Second call for the SAME run: pre-check now finds the row that the
      // first call created, so no second deduction happens.
      deductionModel.findOne.mockResolvedValue({ id: 'ded-1' });
      const result = await service.deductInstallment('kb-1', 'run-1');

      expect(deductionModel.create).toHaveBeenCalledTimes(1);
      expect(result.remainingBalance).toBe('2000000.00');
    });

    // Race-safety net: two concurrent calls both pass the pre-check before
    // either has inserted — the DB unique constraint is what actually
    // prevents the double-deduction, surfaced here as a caught error.
    it('treats a UniqueConstraintError from a concurrent call as a no-op, not a failure', async () => {
      const r = record({
        status: KasbonStatus.APPROVED,
        remainingBalance: '3000000.00',
        installmentAmount: '1000000.00',
      });
      const { service, deductionModel, model } = makeService(r, null);
      deductionModel.create.mockRejectedValue(
        new UniqueConstraintError({ message: 'duplicate' }),
      );
      model.findByPk.mockResolvedValue(r);

      const result = await service.deductInstallment('kb-1', 'run-1');

      expect(result).toBe(r);
      expect(r.update).not.toHaveBeenCalled();
    });

    // TC-KASBON-03 — remaining_balance hits exactly 0 → paid_off, and no
    // further deduction is ever attempted again for this kasbon.
    it('TC-KASBON-03: transitions to paid_off when remaining_balance reaches exactly 0', async () => {
      const r = record({
        status: KasbonStatus.APPROVED,
        remainingBalance: '1000000.00',
        installmentAmount: '1000000.00',
      });
      const { service } = makeService(r, null);

      const result = await service.deductInstallment('kb-1', 'run-3');

      expect(result.remainingBalance).toBe('0.00');
      expect(result.status).toBe(KasbonStatus.PAID_OFF);
    });

    it('TC-KASBON-03: a paid_off kasbon is never deducted again, even for a new run', async () => {
      const r = record({
        status: KasbonStatus.PAID_OFF,
        remainingBalance: '0.00',
      });
      const { service, deductionModel } = makeService(r, null);

      const result = await service.deductInstallment('kb-1', 'run-4');

      expect(deductionModel.create).not.toHaveBeenCalled();
      expect(r.update).not.toHaveBeenCalled();
      expect(result.status).toBe(KasbonStatus.PAID_OFF);
    });

    it('clips the final installment to the remaining balance instead of overdrawing', async () => {
      const r = record({
        status: KasbonStatus.APPROVED,
        remainingBalance: '400000.00',
        installmentAmount: '1000000.00',
      });
      const { service, deductionModel } = makeService(r, null);

      const result = await service.deductInstallment('kb-1', 'run-5');

      expect(deductionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '400000.00' }),
      );
      expect(result.remainingBalance).toBe('0.00');
      expect(result.status).toBe(KasbonStatus.PAID_OFF);
    });

    it('rejects deducting from a kasbon that is not approved', async () => {
      const r = record({ status: KasbonStatus.PENDING });
      const { service } = makeService(r, null);

      await expect(service.deductInstallment('kb-1', 'run-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // P8-T07 — reversing a run's deductions when the run is reverted to draft.
  describe('reverseInstallmentsForRun', () => {
    it('restores remaining_balance and deletes the deduction row', async () => {
      const kasbon = record({
        status: KasbonStatus.APPROVED,
        amount: '3000000.00',
        remainingBalance: '2000000.00', // one 1,000,000 installment taken
      });
      const deduction = {
        kasbonId: 'kb-1',
        amount: '1000000.00',
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      const { service, model, deductionModel } = makeService(kasbon, null);
      deductionModel.findAll = jest.fn().mockResolvedValue([deduction]);
      model.findByPk = jest.fn().mockResolvedValue(kasbon);

      const reversed = await service.reverseInstallmentsForRun(
        'run-1',
        'txn' as any,
      );

      expect(reversed).toBe(1);
      expect(kasbon.remainingBalance).toBe('3000000.00'); // restored
      expect(deduction.destroy).toHaveBeenCalled();
    });

    it('un-pays-off a kasbon whose final installment is being reversed', async () => {
      const kasbon = record({
        status: KasbonStatus.PAID_OFF,
        amount: '1000000.00',
        remainingBalance: '0.00',
      });
      const deduction = {
        kasbonId: 'kb-1',
        amount: '1000000.00',
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      const { service, model, deductionModel } = makeService(kasbon, null);
      deductionModel.findAll = jest.fn().mockResolvedValue([deduction]);
      model.findByPk = jest.fn().mockResolvedValue(kasbon);

      await service.reverseInstallmentsForRun('run-1', 'txn' as any);

      expect(kasbon.remainingBalance).toBe('1000000.00');
      expect(kasbon.status).toBe(KasbonStatus.APPROVED); // no longer paid_off
    });

    it('is a no-op when the run drew no installments', async () => {
      const { service, deductionModel } = makeService(null, null);
      deductionModel.findAll = jest.fn().mockResolvedValue([]);

      const reversed = await service.reverseInstallmentsForRun(
        'run-1',
        'txn' as any,
      );
      expect(reversed).toBe(0);
    });
  });
});
