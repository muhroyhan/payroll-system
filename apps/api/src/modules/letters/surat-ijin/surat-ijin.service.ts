import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SuratIjinStatus } from '@payroll-system/shared-types';
import { assertPendingStatus } from '../../../common/approval-workflow/assert-pending';
import { PdfGenerationQueue } from '../../../jobs/pdf-generation.queue';
import { SuratIjin } from './entities/surat-ijin.entity';
import { CreateSuratIjinDto } from './dto/create-surat-ijin.dto';
import { UpdateSuratIjinDto } from './dto/update-surat-ijin.dto';

@Injectable()
export class SuratIjinService {
  constructor(
    @InjectModel(SuratIjin)
    private readonly suratIjinModel: typeof SuratIjin,
    private readonly pdfGenerationQueue: PdfGenerationQueue,
  ) {}

  list(employeeId?: string): Promise<SuratIjin[]> {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    return this.suratIjinModel.findAll({ where, include: ['employee'] });
  }

  // Used by SuratIjinPermissionResolver (P4-T04) to resolve has_permission
  // for attendance reconciliation.
  findApprovedForDate(
    employeeId: string,
    date: string,
  ): Promise<SuratIjin | null> {
    return this.suratIjinModel.findOne({
      where: { employeeId, date, status: SuratIjinStatus.APPROVED },
    });
  }

  async findByIdOrThrow(id: string): Promise<SuratIjin> {
    const record = await this.suratIjinModel.findByPk(id, {
      include: ['employee'],
    });
    if (!record) {
      throw new NotFoundException(`Surat ijin ${id} not found`);
    }
    return record;
  }

  create(dto: CreateSuratIjinDto, createdBy: string): Promise<SuratIjin> {
    return this.suratIjinModel.create({
      ...dto,
      status: SuratIjinStatus.PENDING,
      createdBy,
    } as any);
  }

  async update(id: string, dto: UpdateSuratIjinDto): Promise<SuratIjin> {
    const record = await this.assertPending(id);
    return record.update(dto);
  }

  async remove(id: string): Promise<void> {
    const record = await this.assertPending(id);
    await record.destroy();
  }

  // §5.5/§3 — flips status synchronously (cheap), then enqueues PDF generation
  // as a background job (never inline in the request handler). pdfPath stays
  // null until the job finishes.
  async approve(id: string, approvedBy: string): Promise<SuratIjin> {
    const record = await this.assertPending(id);
    await record.update({ status: SuratIjinStatus.APPROVED, approvedBy });
    await this.pdfGenerationQueue.enqueueSuratIjin(record.id);
    return record;
  }

  async reject(
    id: string,
    rejectedBy: string,
    rejectReason: string,
  ): Promise<SuratIjin> {
    const record = await this.assertPending(id);
    return record.update({
      status: SuratIjinStatus.REJECTED,
      rejectedBy,
      rejectReason,
    });
  }

  private async assertPending(id: string): Promise<SuratIjin> {
    const record = await this.findByIdOrThrow(id);
    assertPendingStatus(
      record.status,
      SuratIjinStatus.PENDING,
      'Surat ijin',
      id,
    );
    return record;
  }
}
