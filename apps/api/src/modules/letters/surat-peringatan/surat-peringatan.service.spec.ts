import { ConflictException, NotFoundException } from '@nestjs/common';
import { SPLevel } from '@payroll-system/shared-types';
import { SuratPeringatanService } from './surat-peringatan.service';

describe('SuratPeringatanService', () => {
  function makeService(
    existingRecord: any = null,
    referencedByPayslip = false,
  ) {
    const model = {
      findAll: jest.fn(),
      findByPk: jest.fn().mockResolvedValue(existingRecord),
      create: jest.fn().mockResolvedValue({ id: 'new-id' }),
    };
    const pdfGenerationQueue = {
      enqueueSuratPeringatan: jest.fn().mockResolvedValue(undefined),
    };
    const sanctionReferenceChecker = {
      isReferencedByPayslip: jest.fn().mockResolvedValue(referencedByPayslip),
    };
    const service = new SuratPeringatanService(
      model as any,
      pdfGenerationQueue as any,
      sanctionReferenceChecker,
    );
    return { service, model, pdfGenerationQueue, sanctionReferenceChecker };
  }

  function record() {
    return {
      id: 'sp-1',
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('create() persists the letter and enqueues PDF generation immediately (no approval step)', async () => {
    const { service, model, pdfGenerationQueue } = makeService();

    await service.create({
      employeeId: 'emp-1',
      level: SPLevel.SP1,
      violationDescription: 'Terlambat',
      issueDate: '2026-07-23',
      issuedBy: 'user-1',
    });

    expect(model.create).toHaveBeenCalled();
    expect(pdfGenerationQueue.enqueueSuratPeringatan).toHaveBeenCalledWith(
      'new-id',
    );
  });

  it('findByIdOrThrow throws NotFoundException when no record exists', async () => {
    const { service } = makeService(null);
    await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update()/remove() succeed when the sanction has not been pulled into a payslip', async () => {
    const { service } = makeService(record(), false);

    await service.update('sp-1', { violationDescription: 'updated' });
    await service.remove('sp-1');
  });

  it('update()/remove() are rejected once the sanction is referenced by a payslip line item (§11 lock)', async () => {
    const { service } = makeService(record(), true);

    await expect(
      service.update('sp-1', { violationDescription: 'x' }),
    ).rejects.toThrow(ConflictException);
    await expect(service.remove('sp-1')).rejects.toThrow(ConflictException);
  });
});
