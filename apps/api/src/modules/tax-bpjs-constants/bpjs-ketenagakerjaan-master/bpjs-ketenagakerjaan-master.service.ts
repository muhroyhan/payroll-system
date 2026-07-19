import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BpjsKetenagakerjaanMaster } from './entities/bpjs-ketenagakerjaan-master.entity';
import { CreateBpjsKetenagakerjaanMasterDto } from './dto/create-bpjs-ketenagakerjaan-master.dto';
import { UpdateBpjsKetenagakerjaanMasterDto } from './dto/update-bpjs-ketenagakerjaan-master.dto';

@Injectable()
export class BpjsKetenagakerjaanMasterService {
  constructor(
    @InjectModel(BpjsKetenagakerjaanMaster)
    private readonly bpjsKetenagakerjaanMasterModel: typeof BpjsKetenagakerjaanMaster,
  ) {}

  list(): Promise<BpjsKetenagakerjaanMaster[]> {
    return this.bpjsKetenagakerjaanMasterModel.findAll();
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
