import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  PayrollRunStatus,
  PayslipLineSource,
} from '@payroll-system/shared-types';
import { SuratIjin } from '../modules/letters/surat-ijin/entities/surat-ijin.entity';
import { SuratPeringatan } from '../modules/letters/surat-peringatan/entities/surat-peringatan.entity';
import { OvertimeLetter } from '../modules/letters/overtime-letters/entities/overtime-letter.entity';
import { Payslip } from '../modules/payslips/entities/payslip.entity';
import { UsersService } from '../modules/users/users.service';
import { renderSuratIjinHtml } from './templates/surat-ijin.template';
import { renderSuratPeringatanHtml } from './templates/surat-peringatan.template';
import { renderOvertimeLetterHtml } from './templates/overtime-letter.template';
import { renderPayslipHtml } from './templates/payslip.template';
import { PdfRendererService } from './pdf-renderer.service';
import { PDF_GENERATION_QUEUE } from './pdf-generation.queue';

const LINE_SOURCE_LABEL: Record<PayslipLineSource, string> = {
  [PayslipLineSource.SALARY_MASTER]: 'Gaji Pokok',
  [PayslipLineSource.INCENTIVE_MASTER]: 'Insentif',
  [PayslipLineSource.TEMP_COMPONENT]: 'Komponen Tambahan',
  [PayslipLineSource.KASBON]: 'Potongan Kasbon',
  [PayslipLineSource.SANCTION]: 'Sanksi',
  [PayslipLineSource.OVERTIME]: 'Lembur',
  [PayslipLineSource.TAX]: 'PPh 21',
  [PayslipLineSource.BPJS]: 'BPJS (Karyawan)',
};

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'letters');

// §2.2 — ONE shared queue/worker for every letter/payslip type. A separate
// @Processor class per document type would register a separate BullMQ Worker
// on the SAME queue name — jobs would then be distributed at random between
// workers, and a job whose name a given worker doesn't recognize gets
// silently marked "completed" without ever being rendered. Job-name dispatch
// must happen inside one process(), not across multiple competing workers.
@Processor(PDF_GENERATION_QUEUE)
export class PdfGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfGenerationProcessor.name);

  constructor(
    @InjectModel(SuratIjin)
    private readonly suratIjinModel: typeof SuratIjin,
    @InjectModel(SuratPeringatan)
    private readonly suratPeringatanModel: typeof SuratPeringatan,
    @InjectModel(OvertimeLetter)
    private readonly overtimeLetterModel: typeof OvertimeLetter,
    @InjectModel(Payslip)
    private readonly payslipModel: typeof Payslip,
    private readonly usersService: UsersService,
    private readonly pdfRendererService: PdfRendererService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'generate-surat-ijin-pdf':
        return this.processSuratIjin(job);
      case 'generate-surat-peringatan-pdf':
        return this.processSuratPeringatan(job);
      case 'generate-overtime-letter-pdf':
        return this.processOvertimeLetter(job);
      case 'generate-payslip-pdf':
        return this.processPayslip(job);
      default:
        this.logger.warn(`Unknown PDF generation job name: ${job.name}`);
    }
  }

  private async processSuratIjin(job: Job): Promise<void> {
    const { suratIjinId } = job.data as { suratIjinId: string };
    const record = await this.suratIjinModel.findByPk(suratIjinId, {
      include: ['employee'],
    });
    if (!record) {
      this.logger.warn(
        `SuratIjin ${suratIjinId} no longer exists — skipping PDF generation`,
      );
      return;
    }

    const approver = record.approvedBy
      ? await this.usersService.findById(record.approvedBy)
      : null;

    const html = renderSuratIjinHtml({
      employeeName: record.employee.name,
      employeeNik: record.employee.nik,
      date: record.date,
      type: record.type,
      reason: record.reason,
      timeRequested: record.timeRequested,
      approvedByName: approver?.name ?? '-',
      issuedDate: new Date().toISOString().slice(0, 10),
    });

    const filePath = await this.renderAndStore(html, 'surat-ijin', suratIjinId);
    await record.update({ pdfPath: filePath });
  }

  private async processSuratPeringatan(job: Job): Promise<void> {
    const { suratPeringatanId } = job.data as { suratPeringatanId: string };
    const record = await this.suratPeringatanModel.findByPk(suratPeringatanId, {
      include: ['employee', 'sanctionComponent'],
    });
    if (!record) {
      this.logger.warn(
        `SuratPeringatan ${suratPeringatanId} no longer exists — skipping PDF generation`,
      );
      return;
    }

    const issuer = await this.usersService.findById(record.issuedBy);

    const html = renderSuratPeringatanHtml({
      employeeName: record.employee.name,
      employeeNik: record.employee.nik,
      level: record.level,
      violationDescription: record.violationDescription,
      issueDate: record.issueDate,
      sanctionComponentName: record.sanctionComponent?.name ?? null,
      sanctionAmount: record.sanctionAmount,
      issuedByName: issuer?.name ?? '-',
    });

    const filePath = await this.renderAndStore(
      html,
      'surat-peringatan',
      suratPeringatanId,
    );
    await record.update({ pdfPath: filePath });
  }

  private async processOvertimeLetter(job: Job): Promise<void> {
    const { overtimeLetterId } = job.data as { overtimeLetterId: string };
    const record = await this.overtimeLetterModel.findByPk(overtimeLetterId, {
      include: ['employee'],
    });
    if (!record) {
      this.logger.warn(
        `OvertimeLetter ${overtimeLetterId} no longer exists — skipping PDF generation`,
      );
      return;
    }

    const verifier = record.verifiedBy
      ? await this.usersService.findById(record.verifiedBy)
      : null;

    const html = renderOvertimeLetterHtml({
      employeeName: record.employee.name,
      employeeNik: record.employee.nik,
      date: record.date,
      plannedOvertimeHours: record.plannedOvertimeHours,
      actualOvertimeHours: record.actualOvertimeHours,
      reason: record.reason,
      verifiedByName: verifier?.name ?? '-',
      verifiedDate: new Date().toISOString().slice(0, 10),
    });

    const filePath = await this.renderAndStore(
      html,
      'overtime-letter',
      overtimeLetterId,
    );
    await record.update({ pdfPath: filePath });
  }

  private async processPayslip(job: Job): Promise<void> {
    const { payslipId } = job.data as { payslipId: string };
    const record = await this.payslipModel.findByPk(payslipId, {
      include: [
        'employee',
        'payrollRun',
        { association: 'lineItems', include: ['component'] },
      ],
    });
    if (!record) {
      this.logger.warn(
        `Payslip ${payslipId} no longer exists — skipping PDF generation`,
      );
      return;
    }

    // §11 — once a run is approved/disbursed, its payslip PDF is the official
    // issued document. Employee master data (name, etc.) can keep changing
    // after that point even though the payslip's money fields are frozen, so
    // silently re-rendering here would produce a document whose header no
    // longer matches what was actually approved/disbursed. A PDF that already
    // exists for such a run is left alone; only a payslip without one yet (or
    // still in a draft/calculated run) gets (re)rendered.
    if (
      record.pdfPath &&
      (record.payrollRun.status === PayrollRunStatus.APPROVED ||
        record.payrollRun.status === PayrollRunStatus.DISBURSED)
    ) {
      this.logger.warn(
        `Payslip ${payslipId} already has a PDF and its run is ${record.payrollRun.status} — skipping silent regeneration`,
      );
      return;
    }

    const lineItems = record.lineItems.map((item) => ({
      label: item.component?.name ?? LINE_SOURCE_LABEL[item.source],
      amount: item.amount,
    }));

    const html = renderPayslipHtml({
      employeeName: record.employee.name,
      employeeNik: record.employee.nik,
      period: record.payrollRun.period,
      lineItems,
      netPay: record.netPay,
      issuedDate: new Date().toISOString().slice(0, 10),
    });

    const filePath = await this.renderAndStore(html, 'payslip', payslipId);
    await record.update({ pdfPath: filePath });
  }

  private async renderAndStore(
    html: string,
    subdir: string,
    id: string,
  ): Promise<string> {
    const pdfBuffer = await this.pdfRendererService.renderHtmlToPdf(html);
    const dir = path.join(STORAGE_ROOT, subdir);
    await fs.mkdir(dir, { recursive: true });
    const absolutePath = path.join(dir, `${id}.pdf`);
    await fs.writeFile(absolutePath, pdfBuffer);
    return path.relative(process.cwd(), absolutePath);
  }
}
