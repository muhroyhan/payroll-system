import { ConflictException, NotFoundException } from '@nestjs/common';
import { LeaveRequestStatus } from '@payroll-system/shared-types';
import { LeaveRequestsService } from './leave-requests.service';

describe('LeaveRequestsService', () => {
  function makeService(existingRecord: any = null, balance: any = null) {
    const model = {
      findAll: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(existingRecord),
      create: jest.fn().mockResolvedValue({
        id: 'new-id',
        status: LeaveRequestStatus.PENDING,
      }),
    };
    const leaveBalancesService = {
      resolveOne: jest.fn().mockResolvedValue(balance),
      incrementUsed: jest.fn().mockResolvedValue(undefined),
    };
    const service = new LeaveRequestsService(
      model as any,
      leaveBalancesService as any,
    );
    return { service, model, leaveBalancesService };
  }

  function pendingRequest(overrides: Partial<any> = {}) {
    return {
      id: 'lr-1',
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: '2026-08-03',
      endDate: '2026-08-04',
      status: LeaveRequestStatus.PENDING,
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  // TC-LEAVE-03 — approving increments `used`; there's no path that lets a
  // caller patch `used` directly, only via approve()'s incrementUsed() call.
  it('TC-LEAVE-03: approve() increments the resolved balance by the requested weekday count', async () => {
    const record = pendingRequest();
    const balance = { id: 'bal-1', quota: 12, used: 2 };
    const { service, leaveBalancesService } = makeService(record, balance);

    await service.approve('lr-1', 'approver-1');

    // 2026-08-03 (Mon) through 2026-08-04 (Tue) = 2 weekdays.
    expect(leaveBalancesService.incrementUsed).toHaveBeenCalledWith('bal-1', 2);
    expect(record.update).toHaveBeenCalledWith({
      status: LeaveRequestStatus.APPROVED,
      approvedBy: 'approver-1',
    });
  });

  // TC-LEAVE-04 — exceeding remaining balance is rejected, not silently
  // approved into negative balance.
  it('TC-LEAVE-04: approve() is rejected when requested days exceed remaining balance', async () => {
    const record = pendingRequest({
      startDate: '2026-08-03',
      endDate: '2026-08-07', // Mon-Fri = 5 weekdays
    });
    const balance = { id: 'bal-1', quota: 12, used: 10 }; // only 2 remaining
    const { service, leaveBalancesService } = makeService(record, balance);

    await expect(service.approve('lr-1', 'approver-1')).rejects.toThrow(
      ConflictException,
    );
    expect(leaveBalancesService.incrementUsed).not.toHaveBeenCalled();
    expect(record.update).not.toHaveBeenCalled();
  });

  // TC-LEAVE-05 — once approved/rejected, permanently locked (§11): no
  // un-approve, no edit, no delete. Written against the shared
  // assertPendingStatus() guard this service migrated to in P4-T02, to prove
  // the migration didn't change locking behavior.
  it('TC-LEAVE-05: update()/remove()/approve() are all rejected on an already-approved request', async () => {
    const record = pendingRequest({ status: LeaveRequestStatus.APPROVED });
    const { service } = makeService(record);

    await expect(
      service.update('lr-1', { endDate: '2026-08-10' }),
    ).rejects.toThrow(ConflictException);
    await expect(service.remove('lr-1')).rejects.toThrow(ConflictException);
    await expect(service.approve('lr-1', 'approver-2')).rejects.toThrow(
      ConflictException,
    );
  });

  it('TC-LEAVE-05: update()/remove() are also rejected on an already-rejected request', async () => {
    const record = pendingRequest({ status: LeaveRequestStatus.REJECTED });
    const { service } = makeService(record);

    await expect(service.update('lr-1', {})).rejects.toThrow(ConflictException);
    await expect(service.remove('lr-1')).rejects.toThrow(ConflictException);
  });

  it('update()/remove() succeed while still pending', async () => {
    const record = pendingRequest();
    const { service } = makeService(record);

    await service.update('lr-1', { endDate: '2026-08-05' });
    expect(record.update).toHaveBeenCalledWith({ endDate: '2026-08-05' });

    await service.remove('lr-1');
    expect(record.destroy).toHaveBeenCalled();
  });

  it('findByIdOrThrow throws NotFoundException when no record exists', async () => {
    const { service } = makeService(null);
    await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('create() records createdBy from the current user', async () => {
    const { service, model } = makeService();

    await service.create(
      {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: '2026-08-03',
        endDate: '2026-08-04',
      } as any,
      'user-1',
    );

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: LeaveRequestStatus.PENDING,
        createdBy: 'user-1',
      }),
    );
  });

  it('reject() records rejectedBy/rejectReason from the current user', async () => {
    const record = pendingRequest();
    const { service } = makeService(record);

    await service.reject('lr-1', 'rejecter-1', 'Overlaps another request');

    expect(record.update).toHaveBeenCalledWith({
      status: LeaveRequestStatus.REJECTED,
      rejectedBy: 'rejecter-1',
      rejectReason: 'Overlaps another request',
    });
  });
});
