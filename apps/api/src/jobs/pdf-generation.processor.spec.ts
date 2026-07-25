import {
  PayrollRunStatus,
  PayslipLineSource,
  SPLevel,
  SuratIjinType,
} from '@payroll-system/shared-types';
import { PdfGenerationProcessor } from './pdf-generation.processor';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// Avoid pulling in the real puppeteer import chain (ESM-only, breaks Jest's
// CJS transform) — this test only cares about job-name dispatch, not
// rendering, so a plain mock class is enough.
jest.mock('./pdf-renderer.service', () => ({
  PdfRendererService: jest.fn(),
}));

// §2.2 — regression test for the bug found while building P4-T02: a second
// @Processor class on the SAME queue name would silently "complete" jobs it
// doesn't own (see pdf-generation.processor.ts's class comment). This proves
// ONE processor correctly dispatches every known job type to its own
// renderer, instead of relying on multiple competing workers.
describe('PdfGenerationProcessor', () => {
  function makeProcessor() {
    const suratIjinRecord = {
      id: 'si-1',
      employee: { name: 'Budi', nik: 'NIK-1' },
      date: '2026-07-23',
      type: SuratIjinType.LATE_ARRIVAL,
      reason: 'r',
      timeRequested: '09:00',
      approvedBy: 'user-1',
      update: jest
        .fn<Promise<void>, [{ pdfPath: string }]>()
        .mockResolvedValue(undefined),
    };
    const suratPeringatanRecord = {
      id: 'sp-1',
      employee: { name: 'Budi', nik: 'NIK-1' },
      level: SPLevel.SP1,
      violationDescription: 'v',
      issueDate: '2026-07-23',
      sanctionComponent: null,
      sanctionAmount: null,
      issuedBy: 'user-1',
      update: jest
        .fn<Promise<void>, [{ pdfPath: string }]>()
        .mockResolvedValue(undefined),
    };
    const overtimeLetterRecord = {
      id: 'ol-1',
      employee: { name: 'Budi', nik: 'NIK-1' },
      date: '2026-07-23',
      plannedOvertimeHours: '3.00',
      actualOvertimeHours: '2.50',
      reason: 'r',
      verifiedBy: 'user-1',
      update: jest
        .fn<Promise<void>, [{ pdfPath: string }]>()
        .mockResolvedValue(undefined),
    };
    const payslipRecord = {
      id: 'ps-1',
      employee: { name: 'Budi', nik: 'NIK-1' },
      payrollRun: { period: '2026-11', status: PayrollRunStatus.CALCULATED },
      lineItems: [
        {
          source: PayslipLineSource.SALARY_MASTER,
          component: null,
          amount: '8000000.00',
        },
        {
          source: PayslipLineSource.TAX,
          component: null,
          amount: '-123800.00',
        },
      ],
      netPay: '7876200.00',
      pdfPath: null as string | null,
      update: jest
        .fn<Promise<void>, [{ pdfPath: string }]>()
        .mockImplementation(function (this: any, patch) {
          Object.assign(this, patch);
          return Promise.resolve();
        }),
    };
    const suratIjinModel = {
      findByPk: jest.fn().mockResolvedValue(suratIjinRecord),
    };
    const suratPeringatanModel = {
      findByPk: jest.fn().mockResolvedValue(suratPeringatanRecord),
    };
    const overtimeLetterModel = {
      findByPk: jest.fn().mockResolvedValue(overtimeLetterRecord),
    };
    const payslipModel = {
      findByPk: jest.fn().mockResolvedValue(payslipRecord),
    };
    const usersService = {
      findById: jest.fn().mockResolvedValue({ name: 'Approver' }),
    };
    const pdfRendererService = {
      renderHtmlToPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    const processor = new PdfGenerationProcessor(
      suratIjinModel as any,
      suratPeringatanModel as any,
      overtimeLetterModel as any,
      payslipModel as any,
      usersService as any,
      pdfRendererService as any,
    );
    return {
      processor,
      suratIjinModel,
      suratPeringatanModel,
      overtimeLetterModel,
      payslipModel,
      suratIjinRecord,
      suratPeringatanRecord,
      overtimeLetterRecord,
      payslipRecord,
      pdfRendererService,
    };
  }

  it('dispatches generate-surat-ijin-pdf to the surat_ijin renderer only', async () => {
    const { processor, suratIjinModel, suratPeringatanModel, suratIjinRecord } =
      makeProcessor();

    await processor.process({
      name: 'generate-surat-ijin-pdf',
      data: { suratIjinId: 'si-1' },
    } as any);

    expect(suratIjinModel.findByPk).toHaveBeenCalledWith(
      'si-1',
      expect.anything(),
    );
    expect(suratPeringatanModel.findByPk).not.toHaveBeenCalled();
    const updateArg = suratIjinRecord.update.mock.calls[0][0];
    expect(typeof updateArg.pdfPath).toBe('string');
  });

  it('dispatches generate-surat-peringatan-pdf to the surat_peringatan renderer only', async () => {
    const {
      processor,
      suratIjinModel,
      suratPeringatanModel,
      suratPeringatanRecord,
    } = makeProcessor();

    await processor.process({
      name: 'generate-surat-peringatan-pdf',
      data: { suratPeringatanId: 'sp-1' },
    } as any);

    expect(suratPeringatanModel.findByPk).toHaveBeenCalledWith(
      'sp-1',
      expect.anything(),
    );
    expect(suratIjinModel.findByPk).not.toHaveBeenCalled();
    const updateArg = suratPeringatanRecord.update.mock.calls[0][0];
    expect(typeof updateArg.pdfPath).toBe('string');
  });

  it('dispatches generate-overtime-letter-pdf to the overtime_letter renderer only', async () => {
    const {
      processor,
      suratIjinModel,
      suratPeringatanModel,
      overtimeLetterModel,
      overtimeLetterRecord,
    } = makeProcessor();

    await processor.process({
      name: 'generate-overtime-letter-pdf',
      data: { overtimeLetterId: 'ol-1' },
    } as any);

    expect(overtimeLetterModel.findByPk).toHaveBeenCalledWith(
      'ol-1',
      expect.anything(),
    );
    expect(suratIjinModel.findByPk).not.toHaveBeenCalled();
    expect(suratPeringatanModel.findByPk).not.toHaveBeenCalled();
    const updateArg = overtimeLetterRecord.update.mock.calls[0][0];
    expect(typeof updateArg.pdfPath).toBe('string');
  });

  it('dispatches generate-payslip-pdf to the payslip renderer only', async () => {
    const { processor, suratIjinModel, payslipModel, payslipRecord } =
      makeProcessor();

    await processor.process({
      name: 'generate-payslip-pdf',
      data: { payslipId: 'ps-1' },
    } as any);

    expect(payslipModel.findByPk).toHaveBeenCalledWith(
      'ps-1',
      expect.anything(),
    );
    expect(suratIjinModel.findByPk).not.toHaveBeenCalled();
    const updateArg = payslipRecord.update.mock.calls[0][0];
    expect(typeof updateArg.pdfPath).toBe('string');
  });

  // §11/P8-T05 — once a run is approved/disbursed, the employee's master data
  // can keep changing but the already-issued payslip PDF must not be
  // silently re-rendered with new header info.
  it('does NOT regenerate a payslip PDF that already exists once the run is approved', async () => {
    const { processor, payslipModel, payslipRecord, pdfRendererService } =
      makeProcessor();
    payslipRecord.pdfPath = 'storage/payslip/ps-1.pdf';
    payslipRecord.payrollRun.status = PayrollRunStatus.APPROVED;

    await processor.process({
      name: 'generate-payslip-pdf',
      data: { payslipId: 'ps-1' },
    } as any);

    expect(payslipModel.findByPk).toHaveBeenCalled();
    expect(pdfRendererService.renderHtmlToPdf).not.toHaveBeenCalled();
    expect(payslipRecord.update).not.toHaveBeenCalled();
  });

  it('does NOT regenerate a payslip PDF that already exists once the run is disbursed', async () => {
    const { processor, payslipRecord, pdfRendererService } = makeProcessor();
    payslipRecord.pdfPath = 'storage/payslip/ps-1.pdf';
    payslipRecord.payrollRun.status = PayrollRunStatus.DISBURSED;

    await processor.process({
      name: 'generate-payslip-pdf',
      data: { payslipId: 'ps-1' },
    } as any);

    expect(pdfRendererService.renderHtmlToPdf).not.toHaveBeenCalled();
    expect(payslipRecord.update).not.toHaveBeenCalled();
  });

  it('still generates a payslip PDF for a calculated run even if pdfPath is already set (e.g. a prior partial retry)', async () => {
    const { processor, payslipRecord, pdfRendererService } = makeProcessor();
    payslipRecord.pdfPath = 'storage/payslip/ps-1-old.pdf';
    payslipRecord.payrollRun.status = PayrollRunStatus.CALCULATED;

    await processor.process({
      name: 'generate-payslip-pdf',
      data: { payslipId: 'ps-1' },
    } as any);

    expect(pdfRendererService.renderHtmlToPdf).toHaveBeenCalled();
    expect(payslipRecord.update).toHaveBeenCalled();
  });

  it('does not throw on an unrecognized job name (logs and returns)', async () => {
    const { processor } = makeProcessor();

    await expect(
      processor.process({ name: 'some-future-job', data: {} } as any),
    ).resolves.toBeUndefined();
  });
});
