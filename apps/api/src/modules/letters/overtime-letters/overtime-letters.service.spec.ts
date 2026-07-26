import { ConflictException, NotFoundException } from '@nestjs/common';
import { OvertimeLetterStatus } from '@payroll-system/shared-types';
import { OvertimeLettersService } from './overtime-letters.service';

describe('OvertimeLettersService', () => {
  function makeService(
    existingRecord: any = null,
    referencedByPayslip = false,
  ) {
    const model = {
      findAll: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(existingRecord),
      create: jest.fn().mockResolvedValue({
        id: 'new-id',
        status: OvertimeLetterStatus.PENDING,
      }),
    };
    const pdfGenerationQueue = {
      enqueueOvertimeLetter: jest.fn().mockResolvedValue(undefined),
    };
    const payslipReferenceChecker = {
      isReferencedByPayslip: jest.fn().mockResolvedValue(referencedByPayslip),
    };
    const service = new OvertimeLettersService(
      model as any,
      pdfGenerationQueue as any,
      payslipReferenceChecker,
    );
    return { service, model, pdfGenerationQueue, payslipReferenceChecker };
  }

  function record(overrides: Partial<any> = {}) {
    return {
      id: 'ol-1',
      status: OvertimeLetterStatus.PENDING,
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('create() always starts a new letter as pending', async () => {
    const { service, model } = makeService();
    await service.create(
      {
        employeeId: 'emp-1',
        date: '2026-07-23',
        plannedOvertimeHours: '3.00',
        actualOvertimeHours: '2.50',
        reason: 'r',
      },
      'user-1',
    );
    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: OvertimeLetterStatus.PENDING,
        createdBy: 'user-1',
      }),
    );
  });

  it('findByIdOrThrow throws NotFoundException when no record exists', async () => {
    const { service } = makeService(null);
    await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('verify() flips status, sets verifiedBy, and enqueues PDF generation', async () => {
    const r = record();
    const { service, pdfGenerationQueue } = makeService(r);

    await service.verify('ol-1', 'user-1');

    expect(r.update).toHaveBeenCalledWith({
      status: OvertimeLetterStatus.VERIFIED,
      verifiedBy: 'user-1',
    });
    expect(pdfGenerationQueue.enqueueOvertimeLetter).toHaveBeenCalledWith(
      'ol-1',
    );
  });

  it('reject() flips status, records rejectedBy/rejectReason, and never enqueues a PDF job', async () => {
    const r = record();
    const { service, pdfGenerationQueue } = makeService(r);

    await service.reject('ol-1', 'rejecter-1', 'Hours look inflated');

    expect(r.update).toHaveBeenCalledWith({
      status: OvertimeLetterStatus.REJECTED,
      rejectedBy: 'rejecter-1',
      rejectReason: 'Hours look inflated',
    });
    expect(pdfGenerationQueue.enqueueOvertimeLetter).not.toHaveBeenCalled();
  });

  it('verify()/reject() are rejected on an already-decided letter (one-way workflow lock)', async () => {
    const r = record({ status: OvertimeLetterStatus.VERIFIED });
    const { service } = makeService(r);

    await expect(service.verify('ol-1', 'user-1')).rejects.toThrow(
      ConflictException,
    );
    await expect(
      service.reject('ol-1', 'rejecter-1', 'too late'),
    ).rejects.toThrow(ConflictException);
  });

  // Deliberate deviation from surat_ijin/leave_requests: unlike those, a
  // VERIFIED overtime letter is still editable — the lock is tied to
  // payslip usage, not to the verified status itself (05_BOUNDARIES §12.5).
  it('update()/remove() succeed on a VERIFIED letter, as long as no payslip references it yet', async () => {
    const r = record({ status: OvertimeLetterStatus.VERIFIED });
    const { service } = makeService(r, false);

    await service.update('ol-1', { actualOvertimeHours: '4.00' });
    expect(r.update).toHaveBeenCalledWith({ actualOvertimeHours: '4.00' });

    await service.remove('ol-1');
    expect(r.destroy).toHaveBeenCalled();
  });

  it('update()/remove() are rejected once a payslip has referenced the letter (§11 lock)', async () => {
    const r = record({ status: OvertimeLetterStatus.VERIFIED });
    const { service, payslipReferenceChecker } = makeService(r, true);

    await expect(
      service.update('ol-1', { actualOvertimeHours: '4.00' }),
    ).rejects.toThrow(ConflictException);
    await expect(service.remove('ol-1')).rejects.toThrow(ConflictException);
    expect(payslipReferenceChecker.isReferencedByPayslip).toHaveBeenCalledWith(
      'overtime',
      'ol-1',
    );
  });
});
