import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TerCategory } from '@payroll-system/shared-types';
import { resolveEffectiveRecords } from '../../../common/effective-dating/resolve-effective';
import { TerBracketMaster } from './entities/ter-bracket-master.entity';
import { CreateTerBracketMasterDto } from './dto/create-ter-bracket-master.dto';
import { UpdateTerBracketMasterDto } from './dto/update-ter-bracket-master.dto';

@Injectable()
export class TerBracketMasterService {
  constructor(
    @InjectModel(TerBracketMaster)
    private readonly terBracketMasterModel: typeof TerBracketMaster,
  ) {}

  // Admin view: every bracket row, active or not.
  list(): Promise<TerBracketMaster[]> {
    return this.terBracketMasterModel.findAll();
  }

  // Payroll-facing: all brackets active for `periodDate` (optionally one category).
  resolveEffective(
    periodDate: string,
    terCategory?: TerCategory,
  ): Promise<TerBracketMaster[]> {
    return resolveEffectiveRecords(
      this.terBracketMasterModel,
      periodDate,
      terCategory ? { terCategory } : {},
    );
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
