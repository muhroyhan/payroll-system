import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PtkpStatus } from '@payroll-system/shared-types';
import {
  resolveEffectiveRecord,
  resolveEffectiveRecords,
} from '../../../common/effective-dating/resolve-effective';
import { PtkpMaster } from './entities/ptkp-master.entity';
import { CreatePtkpMasterDto } from './dto/create-ptkp-master.dto';
import { UpdatePtkpMasterDto } from './dto/update-ptkp-master.dto';

@Injectable()
export class PtkpMasterService {
  constructor(
    @InjectModel(PtkpMaster)
    private readonly ptkpMasterModel: typeof PtkpMaster,
  ) {}

  // Admin view: every row, active or not — HR needs to see expired/future rows
  // to manage effective-dating. Do NOT date-filter this one.
  list(): Promise<PtkpMaster[]> {
    return this.ptkpMasterModel.findAll();
  }

  // Payroll-facing: only the rows active for `periodDate` (all 8 statuses).
  resolveEffective(periodDate: string): Promise<PtkpMaster[]> {
    return resolveEffectiveRecords(this.ptkpMasterModel, periodDate);
  }

  // The single PTKP amount for one status, active for `periodDate`.
  async resolveByStatus(
    ptkpStatus: PtkpStatus,
    periodDate: string,
  ): Promise<PtkpMaster> {
    const record = await resolveEffectiveRecord(
      this.ptkpMasterModel,
      periodDate,
      {
        ptkpStatus,
      },
    );
    if (!record) {
      throw new NotFoundException(
        `No PTKP amount for ${ptkpStatus} effective on ${periodDate}`,
      );
    }
    return record;
  }

  async findByIdOrThrow(id: string): Promise<PtkpMaster> {
    const record = await this.ptkpMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`PTKP master ${id} not found`);
    }
    return record;
  }

  create(dto: CreatePtkpMasterDto, createdBy: string): Promise<PtkpMaster> {
    return this.ptkpMasterModel.create({ ...dto, createdBy } as any);
  }

  async update(id: string, dto: UpdatePtkpMasterDto): Promise<PtkpMaster> {
    const record = await this.findByIdOrThrow(id);
    return record.update(dto);
  }

  // No remove() — tax/BPJS constant tables are never hard-deleted (§11); retire
  // a superseded figure via effectiveEndDate instead.
}
