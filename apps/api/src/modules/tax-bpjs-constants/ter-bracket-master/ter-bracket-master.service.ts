import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TerBracketMaster } from './entities/ter-bracket-master.entity';
import { CreateTerBracketMasterDto } from './dto/create-ter-bracket-master.dto';
import { UpdateTerBracketMasterDto } from './dto/update-ter-bracket-master.dto';

@Injectable()
export class TerBracketMasterService {
  constructor(
    @InjectModel(TerBracketMaster)
    private readonly terBracketMasterModel: typeof TerBracketMaster,
  ) {}

  list(): Promise<TerBracketMaster[]> {
    return this.terBracketMasterModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<TerBracketMaster> {
    const record = await this.terBracketMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`TER bracket master ${id} not found`);
    }
    return record;
  }

  create(
    dto: CreateTerBracketMasterDto,
    createdBy: string,
  ): Promise<TerBracketMaster> {
    return this.terBracketMasterModel.create({ ...dto, createdBy } as any);
  }

  async update(
    id: string,
    dto: UpdateTerBracketMasterDto,
  ): Promise<TerBracketMaster> {
    const record = await this.findByIdOrThrow(id);
    return record.update(dto);
  }
}
