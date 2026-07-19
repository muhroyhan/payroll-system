import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BpjsKesehatanMaster } from './entities/bpjs-kesehatan-master.entity';
import { CreateBpjsKesehatanMasterDto } from './dto/create-bpjs-kesehatan-master.dto';
import { UpdateBpjsKesehatanMasterDto } from './dto/update-bpjs-kesehatan-master.dto';

@Injectable()
export class BpjsKesehatanMasterService {
  constructor(
    @InjectModel(BpjsKesehatanMaster)
    private readonly bpjsKesehatanMasterModel: typeof BpjsKesehatanMaster,
  ) {}

  list(): Promise<BpjsKesehatanMaster[]> {
    return this.bpjsKesehatanMasterModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<BpjsKesehatanMaster> {
    const record = await this.bpjsKesehatanMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`BPJS Kesehatan master ${id} not found`);
    }
    return record;
  }

  create(
    dto: CreateBpjsKesehatanMasterDto,
    createdBy: string,
  ): Promise<BpjsKesehatanMaster> {
    return this.bpjsKesehatanMasterModel.create({ ...dto, createdBy } as any);
  }

  async update(
    id: string,
    dto: UpdateBpjsKesehatanMasterDto,
  ): Promise<BpjsKesehatanMaster> {
    const record = await this.findByIdOrThrow(id);
    return record.update(dto);
  }
}
