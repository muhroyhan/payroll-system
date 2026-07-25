import { NotFoundException } from '@nestjs/common';
import { LeaveBalancesService } from './leave-balances.service';

describe('LeaveBalancesService', () => {
  function makeService(existingBalance: any = null, resolution: any = null) {
    const model = {
      findOne: jest.fn().mockResolvedValue(existingBalance),
      findByPk: jest.fn().mockResolvedValue(existingBalance),
      findAll: jest.fn(),
      create: jest.fn().mockImplementation((data: any) =>
        Promise.resolve({
          id: 'new-balance-id',
          ...data,
          update: jest.fn().mockImplementation(function (
            this: any,
            patch: any,
          ) {
            Object.assign(this, patch);
            return Promise.resolve(this);
          }),
        }),
      ),
    };
    const employeeModel = {
      findAll: jest.fn().mockResolvedValue([]),
    };
    const leavePolicyMasterService = {
      resolveForEmployee: jest.fn().mockResolvedValue(resolution),
    };
    const service = new LeaveBalancesService(
      model as any,
      employeeModel as any,
      leavePolicyMasterService as any,
    );
    return { service, model, employeeModel, leavePolicyMasterService };
  }

  function balance(overrides: Partial<any> = {}) {
    return {
      id: 'bal-1',
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      year: 2026,
      quota: 12,
      used: 0,
      manuallyAdjusted: false,
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
      ...overrides,
    };
  }

  // TC-LEAVE-01 — no existing row yet: resolveOne must go through
  // LeavePolicyMasterService.resolveForEmployee (the shared §5.2 scope
  // resolver's consumer), never a second/parallel resolution mechanism (§3).
  it('TC-LEAVE-01: resolveOne() calls LeavePolicyMasterService.resolveForEmployee (not a duplicate resolver) and creates the balance from its quota', async () => {
    const resolution = {
      resolved: true,
      record: { id: 'policy-1', annualQuota: 12 },
    };
    const { service, model, leavePolicyMasterService } = makeService(
      null,
      resolution,
    );

    const result = await service.resolveOne('emp-1', 'lt-1', 2026);

    expect(leavePolicyMasterService.resolveForEmployee).toHaveBeenCalledWith(
      'emp-1',
      'lt-1',
      '2026-01-01',
    );
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        year: 2026,
        quota: 12,
        used: 0,
        manuallyAdjusted: false,
      }),
    );
    expect(result.quota).toBe(12);
  });

  it('resolveOne() throws NotFoundException when no leave_policy_master rule resolves', async () => {
    const { service, model } = makeService(null, { resolved: false });

    await expect(service.resolveOne('emp-1', 'lt-1', 2026)).rejects.toThrow(
      NotFoundException,
    );
    expect(model.create).not.toHaveBeenCalled();
  });

  // TC-LEAVE-02 — idempotency is what protects a manually-adjusted quota: a
  // balance row that already exists (whether HR-adjusted or not) is returned
  // as-is, never re-derived from the policy and overwritten.
  it('TC-LEAVE-02: resolveOne() returns the EXISTING row unchanged when one already exists — a manually-adjusted quota survives the next resolution call', async () => {
    const existing = balance({ quota: 20, manuallyAdjusted: true });
    const { service, leavePolicyMasterService, model } = makeService(
      existing,
      { resolved: true, record: { id: 'policy-1', annualQuota: 12 } }, // policy says 12
    );

    const result = await service.resolveOne('emp-1', 'lt-1', 2026);

    // The policy-derived value (12) never overwrites the manual one (20).
    expect(result.quota).toBe(20);
    expect(result.manuallyAdjusted).toBe(true);
    expect(leavePolicyMasterService.resolveForEmployee).not.toHaveBeenCalled();
    expect(model.create).not.toHaveBeenCalled();
  });

  // TC-LEAVE-02 — the HR-facing update path: always marks manuallyAdjusted.
  it('TC-LEAVE-02: updateQuota() sets the new quota and marks manuallyAdjusted:true', async () => {
    const record = balance({ quota: 12, manuallyAdjusted: false });
    const { service } = makeService(record);

    const result = await service.updateQuota('bal-1', { quota: 20 });

    expect(record.update).toHaveBeenCalledWith({
      quota: 20,
      manuallyAdjusted: true,
    });
    expect(result.quota).toBe(20);
    expect(result.manuallyAdjusted).toBe(true);
  });

  // TC-LEAVE-02 (end-to-end of the guarantee) — after HR manually adjusts a
  // quota, a LATER resolveOne() call for the same employee/leaveType/year
  // (e.g. a bulk year-start re-run) must not silently recompute it back to
  // the department-wide policy value.
  it('TC-LEAVE-02: a manual update() followed by a later resolveOne() does not get overwritten back to the policy value', async () => {
    const record = balance({ quota: 12, manuallyAdjusted: false });
    const { service, model, leavePolicyMasterService } = makeService(record);

    await service.updateQuota('bal-1', { quota: 20 });
    expect(record.quota).toBe(20);
    expect(record.manuallyAdjusted).toBe(true);

    // Now simulate a subsequent resolution pass finding this same row already
    // exists — model.findOne must be wired to return the (now-adjusted) row.
    model.findOne.mockResolvedValue(record);
    const result = await service.resolveOne('emp-1', 'lt-1', 2026);

    expect(result.quota).toBe(20);
    expect(leavePolicyMasterService.resolveForEmployee).not.toHaveBeenCalled();
  });

  it('findByIdOrThrow throws NotFoundException when no record exists', async () => {
    const { service } = makeService(null);
    await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('incrementUsed() adds to used without touching quota/manuallyAdjusted', async () => {
    const record = balance({ quota: 12, used: 2 });
    const { service } = makeService(record);

    const result = await service.incrementUsed('bal-1', 3);

    expect(record.update).toHaveBeenCalledWith({ used: 5 });
    expect(result.used).toBe(5);
  });
});
