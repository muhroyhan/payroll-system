import { ConflictException, NotFoundException } from '@nestjs/common';
import { PayrollRunStatus, Role } from '@payroll-system/shared-types';
import { SYSTEM_AUDIT_OPTIONS } from '../../common/audit/audit-actor';
import { PayrollRunsService } from './payroll-runs.service';

describe('PayrollRunsService (P8-T01)', () => {
  function makeService(existing: any = null) {
    const model = {
      findAll: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(existing),
      create: jest
        .fn()
        .mockImplementation((data: any) => Promise.resolve(data)),
    };
    const queue = {
      enqueueCalculateRun: jest.fn().mockResolvedValue(undefined),
    };
    const sequelize = {
      transaction: jest
        .fn()
        .mockImplementation((cb: (t: unknown) => unknown) => cb('txn')),
    };
    const revertService = {
      revertRunData: jest.fn().mockResolvedValue({
        deletedPayslips: 0,
        deletedLineItems: 0,
        reversedKasbonDeductions: 0,
      }),
    };
    const service = new PayrollRunsService(
      sequelize as any,
      model as any,
      queue as any,
      revertService as any,
    );
    return { service, model, queue, sequelize, revertService };
  }

  function run(status: PayrollRunStatus) {
    return {
      id: 'run-1',
      status,
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
    };
  }

  it('create() starts a run in draft', async () => {
    const { service, model } = makeService();
    await service.create({ period: '2026-07' }, 'user-1', Role.ADMIN);
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        period: '2026-07',
        status: PayrollRunStatus.DRAFT,
        createdBy: 'user-1',
      }),
      expect.objectContaining({ actorId: 'user-1', actorRole: Role.ADMIN }),
    );
  });

  it('findByIdOrThrow throws NotFoundException when missing', async () => {
    const { service } = makeService(null);
    await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('requestCalculation: enqueues the job for a draft run', async () => {
    const r = run(PayrollRunStatus.DRAFT);
    const { service, queue } = makeService(r);
    const result = await service.requestCalculation('run-1');
    expect(queue.enqueueCalculateRun).toHaveBeenCalledWith('run-1');
    expect(result).toEqual({ payrollRunId: 'run-1' });
  });

  it('requestCalculation: rejects a non-draft run (must revert first)', async () => {
    const r = run(PayrollRunStatus.CALCULATED);
    const { service, queue } = makeService(r);
    await expect(service.requestCalculation('run-1')).rejects.toThrow(
      ConflictException,
    );
    expect(queue.enqueueCalculateRun).not.toHaveBeenCalled();
  });

  it('markCalculated: draft → calculated', async () => {
    const r = run(PayrollRunStatus.DRAFT);
    const { service } = makeService(r);
    const result = await service.markCalculated('run-1');
    expect(result.status).toBe(PayrollRunStatus.CALCULATED);
    // Audit follow-up — this transition is system-triggered (no @CurrentUser()
    // available), so it's tagged with the 'system' actor role, not a user id.
    expect(r.update).toHaveBeenCalledWith(
      { status: PayrollRunStatus.CALCULATED },
      SYSTEM_AUDIT_OPTIONS,
    );
  });

  it('approve: calculated → approved, sets approvedBy', async () => {
    const r = run(PayrollRunStatus.CALCULATED);
    const { service } = makeService(r);
    const result = await service.approve('run-1', 'approver-1', Role.ADMIN);
    expect(r.update).toHaveBeenCalledWith(
      {
        status: PayrollRunStatus.APPROVED,
        approvedBy: 'approver-1',
      },
      expect.objectContaining({ actorId: 'approver-1', actorRole: Role.ADMIN }),
    );
    expect(result.status).toBe(PayrollRunStatus.APPROVED);
  });

  it('disburse: approved → disbursed, sets lockedAt and disbursedBy', async () => {
    const r = run(PayrollRunStatus.APPROVED);
    const { service } = makeService(r);
    const result = await service.disburse('run-1', 'disburser-1', Role.ADMIN);
    expect(result.status).toBe(PayrollRunStatus.DISBURSED);
    expect(result.lockedAt).toBeInstanceOf(Date);
    // Audit-trail follow-up (§1B/HIGH) — the money-out step's actor, from
    // whichever user the controller resolved via @CurrentUser(), not a
    // dto/body value.
    expect(result.disbursedBy).toBe('disburser-1');
    expect(r.update).toHaveBeenCalledWith(
      expect.objectContaining({ disbursedBy: 'disburser-1' }),
      expect.objectContaining({ actorId: 'disburser-1', actorRole: Role.ADMIN }),
    );
  });

  // Audit-trail follow-up (dispute-traceability review, §1B/HIGH) —
  // revert-to-draft previously recorded no actor and no reason at all.
  describe('revertToDraft — actor + reason (audit-trail follow-up)', () => {
    it('records revertedBy/revertReason and tears down payslips + kasbon in a txn', async () => {
      const r = run(PayrollRunStatus.CALCULATED);
      const { service, revertService, sequelize } = makeService(r);
      const result = await service.revertToDraft(
        'run-1',
        'reverter-1',
        'Data absensi Juli salah, perlu dihitung ulang',
        Role.ADMIN,
      );
      expect(result.status).toBe(PayrollRunStatus.DRAFT);
      // Teardown runs, and it runs inside a transaction (atomic with the flip).
      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(revertService.revertRunData).toHaveBeenCalledWith('run-1', 'txn');
      expect(r.update).toHaveBeenCalledWith(
        {
          revertedBy: 'reverter-1',
          revertReason: 'Data absensi Juli salah, perlu dihitung ulang',
        },
        {
          transaction: 'txn',
          actorId: 'reverter-1',
          actorRole: Role.ADMIN,
          auditReason: 'Data absensi Juli salah, perlu dihitung ulang',
        },
      );
    });

    it('writes revertedBy/revertReason BEFORE tearing down the run\'s data — order matters (see service comment)', async () => {
      const r = run(PayrollRunStatus.CALCULATED);
      const { service, revertService } = makeService(r);
      const callOrder: string[] = [];
      (r.update as jest.Mock).mockImplementation(function (this: any, patch: any) {
        if ('revertedBy' in patch) callOrder.push('write-actor-reason');
        Object.assign(this, patch);
        return Promise.resolve(this);
      });
      revertService.revertRunData.mockImplementation(async () => {
        callOrder.push('teardown');
        return {
          deletedPayslips: 0,
          deletedLineItems: 0,
          reversedKasbonDeductions: 0,
          deletedExclusions: 0,
        };
      });

      await service.revertToDraft('run-1', 'reverter-1', 'Alasan revert', Role.ADMIN);

      expect(callOrder).toEqual(['write-actor-reason', 'teardown']);
    });
  });

  it('revertToDraft: resets the P8-T02 progress counters back to 0', async () => {
    // Found via manual browser verification (FE-T26/27/28): a reverted run
    // kept its stale processedCount/totalCount from the calculation that was
    // just torn down, which made the frontend's "still calculating" check
    // (draft + totalCount > 0) never clear again.
    const r = Object.assign(run(PayrollRunStatus.CALCULATED), {
      processedCount: 21,
      totalCount: 21,
    });
    const { service } = makeService(r);
    const result = await service.revertToDraft(
      'run-1',
      'reverter-1',
      'Alasan revert',
      Role.ADMIN,
    );
    expect(result.processedCount).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it('revertToDraft: does NOT tear down data when the transition is rejected', async () => {
    const { service, revertService } = makeService(
      run(PayrollRunStatus.APPROVED),
    );
    await expect(
      service.revertToDraft('run-1', 'reverter-1', 'Alasan revert', Role.ADMIN),
    ).rejects.toThrow(ConflictException);
    // The guard throws before any teardown — an approved run's payslips are safe.
    expect(revertService.revertRunData).not.toHaveBeenCalled();
  });

  // §11 / TC-PAYROLL-05 — the guarded rejections.
  it('rejects approving a draft run (stage skip)', async () => {
    const { service } = makeService(run(PayrollRunStatus.DRAFT));
    await expect(service.approve('run-1', 'u', Role.ADMIN)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects reverting an approved run', async () => {
    const { service } = makeService(run(PayrollRunStatus.APPROVED));
    await expect(
      service.revertToDraft('run-1', 'reverter-1', 'Alasan revert', Role.ADMIN),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects reverting a disbursed run (terminal, no revert path)', async () => {
    const { service } = makeService(run(PayrollRunStatus.DISBURSED));
    await expect(
      service.revertToDraft('run-1', 'reverter-1', 'Alasan revert', Role.ADMIN),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects disbursing a run that is not yet approved', async () => {
    const { service } = makeService(run(PayrollRunStatus.CALCULATED));
    await expect(
      service.disburse('run-1', 'disburser-1', Role.ADMIN),
    ).rejects.toThrow(ConflictException);
  });
});
