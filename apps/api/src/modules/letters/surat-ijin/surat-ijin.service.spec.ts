import { ConflictException, NotFoundException } from '@nestjs/common';
import { SuratIjinStatus, SuratIjinType } from '@payroll-system/shared-types';
import { SuratIjinService } from './surat-ijin.service';

describe('SuratIjinService', () => {
  function makeService(existingRecord: any = null) {
    const model = {
      findAll: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(existingRecord),
      create: jest
        .fn()
        .mockResolvedValue({ id: 'new-id', status: SuratIjinStatus.PENDING }),
    };
    const pdfGenerationQueue = {
      enqueueSuratIjin: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SuratIjinService(
      model as any,
      pdfGenerationQueue as any,
    );
    return { service, model, pdfGenerationQueue };
  }

  function pendingRecord() {
    return {
      id: 'si-1',
      status: SuratIjinStatus.PENDING,
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('create() always starts a new letter as pending, regardless of input', async () => {
    const { service, model } = makeService();
    await service.create({
      employeeId: 'emp-1',
      date: '2026-07-20',
      type: SuratIjinType.LATE_ARRIVAL,
      reason: 'r',
      timeRequested: '09:00',
    });
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: SuratIjinStatus.PENDING }),
    );
  });

  it('findByIdOrThrow throws NotFoundException when no record exists', async () => {
    const { service } = makeService(null);
    await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('approve() flips status, sets approvedBy, and enqueues PDF generation', async () => {
    const record = pendingRecord();
    const { service, pdfGenerationQueue } = makeService(record);

    const result = await service.approve('si-1', 'user-1');

    expect(record.update).toHaveBeenCalledWith({
      status: SuratIjinStatus.APPROVED,
      approvedBy: 'user-1',
    });
    expect(pdfGenerationQueue.enqueueSuratIjin).toHaveBeenCalledWith('si-1');
    expect(result.status).toBe(SuratIjinStatus.APPROVED);
  });

  it('reject() flips status and never enqueues a PDF job', async () => {
    const record = pendingRecord();
    const { service, pdfGenerationQueue } = makeService(record);

    await service.reject('si-1');

    expect(record.update).toHaveBeenCalledWith({
      status: SuratIjinStatus.REJECTED,
    });
    expect(pdfGenerationQueue.enqueueSuratIjin).not.toHaveBeenCalled();
  });

  it('approve() on an already-approved letter is rejected (§11 lock)', async () => {
    const record = { ...pendingRecord(), status: SuratIjinStatus.APPROVED };
    const { service } = makeService(record);

    await expect(service.approve('si-1', 'user-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('update()/remove() on an already-approved letter are rejected (§11 lock)', async () => {
    const record = { ...pendingRecord(), status: SuratIjinStatus.APPROVED };
    const { service } = makeService(record);

    await expect(service.update('si-1', { reason: 'x' })).rejects.toThrow(
      ConflictException,
    );
    await expect(service.remove('si-1')).rejects.toThrow(ConflictException);
  });

  it('update()/remove() on a pending letter succeed', async () => {
    const record = pendingRecord();
    const { service } = makeService(record);

    await service.update('si-1', { reason: 'updated reason' });
    expect(record.update).toHaveBeenCalledWith({ reason: 'updated reason' });

    await service.remove('si-1');
    expect(record.destroy).toHaveBeenCalled();
  });
});
