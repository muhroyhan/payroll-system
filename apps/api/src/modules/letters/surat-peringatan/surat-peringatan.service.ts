import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SuratPeringatan } from './entities/surat-peringatan.entity';
import { CreateSuratPeringatanDto } from './dto/create-surat-peringatan.dto';
import { UpdateSuratPeringatanDto } from './dto/update-surat-peringatan.dto';
import { PdfGenerationQueue } from '../../../jobs/pdf-generation.queue';
import { PAYSLIP_REFERENCE_CHECKER } from '../../../common/payslip-reference/payslip-reference-checker.interface';
import type { PayslipReferenceChecker } from '../../../common/payslip-reference/payslip-reference-checker.interface';

@Injectable()
export class SuratPeringatanService {
  constructor(
    @InjectModel(SuratPeringatan)
    private readonly suratPeringatanModel: typeof SuratPeringatan,
    private readonly pdfGenerationQueue: PdfGenerationQueue,
    @Inject(PAYSLIP_REFERENCE_CHECKER)
    private readonly payslipReferenceChecker: PayslipReferenceChecker,
  ) {}

  list(employeeId?: string): Promise<SuratPeringatan[]> {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    return this.suratPeringatanModel.findAll({
      where,
      include: ['employee', 'sanctionComponent', { association: 'issuedByUser', attributes: ['id', 'name'] }],
      order: [['updatedAt', 'DESC']],
    });
  }

  async findByIdOrThrow(id: string): Promise<SuratPeringatan> {
    const record = await this.suratPeringatanModel.findByPk(id, {
      include: ['employee', 'sanctionComponent', { association: 'issuedByUser', attributes: ['id', 'name'] }],
    });
    if (!record) {
      throw new NotFoundException(`Surat peringatan ${id} not found`);
    }
    return record;
  }

  // §5.5 — no pending/approved workflow for SP (unlike surat_ijin/
  // overtime_letter): it's issued the moment it's created, so the PDF job is
  // enqueued here instead of behind a separate approval step.
  async create(dto: CreateSuratPeringatanDto): Promise<SuratPeringatan> {
    const record = await this.suratPeringatanModel.create({ ...dto } as any);
    await this.pdfGenerationQueue.enqueueSuratPeringatan(record.id);
    return record;
  }

  async update(
    id: string,
    dto: UpdateSuratPeringatanDto,
  ): Promise<SuratPeringatan> {
    const record = await this.assertNotReferencedByPayslip(id);
    return record.update(dto);
  }

  async remove(id: string): Promise<void> {
    const record = await this.assertNotReferencedByPayslip(id);
    await record.destroy();
  }

  private async assertNotReferencedByPayslip(
    id: string,
  ): Promise<SuratPeringatan> {
    const record = await this.findByIdOrThrow(id);
    const referenced = await this.payslipReferenceChecker.isReferencedByPayslip(
      'sanction',
      id,
    );
    if (referenced) {
      throw new ConflictException(
        `Surat peringatan ${id} is locked — its sanction has already been ` +
          `pulled into a payslip line item (§11); a correction is a new SP ` +
          `or a reversal line in a later period, not an edit to this one`,
      );
    }
    return record;
  }
}
