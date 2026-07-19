import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PtkpMaster } from './entities/ptkp-master.entity';
import { CreatePtkpMasterDto } from './dto/create-ptkp-master.dto';
import { UpdatePtkpMasterDto } from './dto/update-ptkp-master.dto';

@Injectable()
export class PtkpMasterService {
  constructor(
    @InjectModel(PtkpMaster)
    private readonly ptkpMasterModel: typeof PtkpMaster,
  ) {}

  list(): Promise<PtkpMaster[]> {
    return this.ptkpMasterModel.findAll();
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
