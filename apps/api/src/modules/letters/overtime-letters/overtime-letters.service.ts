import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { OvertimeLetterStatus } from '@payroll-system/shared-types';
import { assertPendingStatus } from '../../../common/approval-workflow/assert-pending';
import { PAYSLIP_REFERENCE_CHECKER } from '../../../common/payslip-reference/payslip-reference-checker.interface';
import type { PayslipReferenceChecker } from '../../../common/payslip-reference/payslip-reference-checker.interface';
import { PdfGenerationQueue } from '../../../jobs/pdf-generation.queue';
import { OvertimeLetter } from './entities/overtime-letter.entity';
import { CreateOvertimeLetterDto } from './dto/create-overtime-letter.dto';
import { UpdateOvertimeLetterDto } from './dto/update-overtime-letter.dto';

// BUGS#19 — id/name only (never the full User row), see payroll_runs'
// disbursedByUser.
const OVERTIME_LETTER_USER_INCLUDES = [
  { association: 'verifiedByUser', attributes: ['id', 'name'] },
  { association: 'rejectedByUser', attributes: ['id', 'name'] },
  { association: 'createdByUser', attributes: ['id', 'name'] },
];

@Injectable()
export class OvertimeLettersService {
  constructor(
    @InjectModel(OvertimeLetter)
    private readonly overtimeLetterModel: typeof OvertimeLetter,
    private readonly pdfGenerationQueue: PdfGenerationQueue,
    @Inject(PAYSLIP_REFERENCE_CHECKER)
    private readonly payslipReferenceChecker: PayslipReferenceChecker,
  ) {}

  list(employeeId?: string): Promise<OvertimeLetter[]> {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    return this.overtimeLetterModel.findAll({
      where,
      include: ['employee', ...OVERTIME_LETTER_USER_INCLUDES],
      order: [['updatedAt', 'DESC']],
    });
  }

  async findByIdOrThrow(id: string): Promise<OvertimeLetter> {
    const record = await this.overtimeLetterModel.findByPk(id, {
      include: ['employee', ...OVERTIME_LETTER_USER_INCLUDES],
    });
    if (!record) {
      throw new NotFoundException(`Overtime letter ${id} not found`);
    }
    return record;
  }

  create(
    dto: CreateOvertimeLetterDto,
    createdBy: string,
  ): Promise<OvertimeLetter> {
    return this.overtimeLetterModel.create({
      ...dto,
      status: OvertimeLetterStatus.PENDING,
      createdBy,
    } as any);
  }

  // §11/TC-LETTER-05 — deliberately NOT locked by status alone (unlike
  // surat_ijin/leave_requests). 05_BOUNDARIES §12.5 ties this letter's
  // immutability specifically to "verified AND already used in a payslip
  // line item" — a verified-but-unused letter can still be corrected before
  // payroll runs, so the guard here is the payslip reference, not `pending`.
  async update(
    id: string,
    dto: UpdateOvertimeLetterDto,
  ): Promise<OvertimeLetter> {
    const record = await this.assertNotReferencedByPayslip(id);
    return record.update(dto);
  }

  async remove(id: string): Promise<void> {
    const record = await this.assertNotReferencedByPayslip(id);
    await record.destroy();
  }

  // Status transition itself (pending -> verified/rejected) still follows
  // the standard one-way workflow lock — you can't re-verify or re-reject.
  async verify(id: string, verifiedBy: string): Promise<OvertimeLetter> {
    const record = await this.assertPending(id);
    await record.update({
      status: OvertimeLetterStatus.VERIFIED,
      verifiedBy,
    });
    await this.pdfGenerationQueue.enqueueOvertimeLetter(record.id);
    return record;
  }

  async reject(
    id: string,
    rejectedBy: string,
    rejectReason: string,
  ): Promise<OvertimeLetter> {
    const record = await this.assertPending(id);
    return record.update({
      status: OvertimeLetterStatus.REJECTED,
      rejectedBy,
      rejectReason,
    });
  }

  private async assertPending(id: string): Promise<OvertimeLetter> {
    const record = await this.findByIdOrThrow(id);
    assertPendingStatus(
      record.status,
      OvertimeLetterStatus.PENDING,
      'Overtime letter',
      id,
    );
    return record;
  }

  private async assertNotReferencedByPayslip(
    id: string,
  ): Promise<OvertimeLetter> {
    const record = await this.findByIdOrThrow(id);
    const referenced = await this.payslipReferenceChecker.isReferencedByPayslip(
      'overtime',
      id,
    );
    if (referenced) {
      throw new ConflictException(
        `Overtime letter ${id} is locked — its hours have already been ` +
          `pulled into a payslip line item (§11); a correction needs a new ` +
          `letter for a future period, not a retroactive edit`,
      );
    }
    return record;
  }
}
