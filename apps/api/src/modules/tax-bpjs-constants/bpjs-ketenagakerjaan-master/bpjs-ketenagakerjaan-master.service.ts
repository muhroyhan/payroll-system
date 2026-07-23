import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { resolveEffectiveRecord } from '../../../common/effective-dating/resolve-effective';
import { BpjsKetenagakerjaanMaster } from './entities/bpjs-ketenagakerjaan-master.entity';
import { CreateBpjsKetenagakerjaanMasterDto } from './dto/create-bpjs-ketenagakerjaan-master.dto';
import { UpdateBpjsKetenagakerjaanMasterDto } from './dto/update-bpjs-ketenagakerjaan-master.dto';

@Injectable()
export class BpjsKetenagakerjaanMasterService {
  constructor(
    @InjectModel(BpjsKetenagakerjaanMaster)
    private readonly bpjsKetenagakerjaanMasterModel: typeof BpjsKetenagakerjaanMaster,
  ) {}

  // Admin view: every row, active or not (this table intentionally keeps the
  // old + new JP-cap rows side by side, so date-filtering here would hide one).
  list(): Promise<BpjsKetenagakerjaanMaster[]> {
    return this.bpjsKetenagakerjaanMasterModel.findAll();
  }

  // Payroll-facing: the single rate card active for `periodDate`.
  async resolveEffective(
    periodDate: string,
  ): Promise<BpjsKetenagakerjaanMaster> {
    const record = await resolveEffectiveRecord(
      this.bpjsKetenagakerjaanMasterModel,
      periodDate,
    );
    if (!record) {
      throw new NotFoundException(
        `No BPJS Ketenagakerjaan rate card configured effective on ${periodDate}`,
      );
    }
    return record;
  }

  async findByIdOrThrow(id: string): Promise<BpjsKetenagakerjaanMaster> {
    const record = await this.bpjsKetenagakerjaanMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(
        `BPJS Ketenagakerjaan master ${id} not found`,
      );
    }
    return record;
  }

  create(
    dto: CreateBpjsKetenagakerjaanMasterDto,
    createdBy: string,
  ): Promise<BpjsKetenagakerjaanMaster> {
    return this.bpjsKetenagakerjaanMasterModel.create({
      ...dto,
      createdBy,
    } as any);
  }

  async update(
    id: string,
    dto: UpdateBpjsKetenagakerjaanMasterDto,
  ): Promise<BpjsKetenagakerjaanMaster> {
    const record = await this.findByIdOrThrow(id);
    return record.update(dto);
  }
}
