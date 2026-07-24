import { ConflictException, NotFoundException } from '@nestjs/common';
import { PayrollRunStatus } from '@payroll-system/shared-types';
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
    const service = new PayrollRunsService(model as any, queue as any);
    return { service, model, queue };
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
    await service.create({ period: '2026-07' }, 'user-1');
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        period: '2026-07',
        status: PayrollRunStatus.DRAFT,
        createdBy: 'user-1',
      }),
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
  });

  it('approve: calculated → approved, sets approvedBy', async () => {
    const r = run(PayrollRunStatus.CALCULATED);
    const { service } = makeService(r);
    const result = await service.approve('run-1', 'approver-1');
    expect(r.update).toHaveBeenCalledWith({
      status: PayrollRunStatus.APPROVED,
      approvedBy: 'approver-1',
    });
    expect(result.status).toBe(PayrollRunStatus.APPROVED);
  });

  it('disburse: approved → disbursed, sets lockedAt', async () => {
    const r = run(PayrollRunStatus.APPROVED);
    const { service } = makeService(r);
    const result = await service.disburse('run-1');
    expect(result.status).toBe(PayrollRunStatus.DISBURSED);
    expect(result.lockedAt).toBeInstanceOf(Date);
  });

  it('revertToDraft: calculated → draft', async () => {
    const r = run(PayrollRunStatus.CALCULATED);
    const { service } = makeService(r);
    const result = await service.revertToDraft('run-1');
    expect(result.status).toBe(PayrollRunStatus.DRAFT);
  });

  // §11 / TC-PAYROLL-05 — the guarded rejections.
  it('rejects approving a draft run (stage skip)', async () => {
    const { service } = makeService(run(PayrollRunStatus.DRAFT));
    await expect(service.approve('run-1', 'u')).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects reverting an approved run', async () => {
    const { service } = makeService(run(PayrollRunStatus.APPROVED));
    await expect(service.revertToDraft('run-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects reverting a disbursed run (terminal, no revert path)', async () => {
    const { service } = makeService(run(PayrollRunStatus.DISBURSED));
    await expect(service.revertToDraft('run-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects disbursing a run that is not yet approved', async () => {
    const { service } = makeService(run(PayrollRunStatus.CALCULATED));
    await expect(service.disburse('run-1')).rejects.toThrow(ConflictException);
  });
});
