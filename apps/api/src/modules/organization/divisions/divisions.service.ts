import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ForeignKeyConstraintError } from 'sequelize';
import { Division } from './entities/division.entity';
import { CreateDivisionDto } from './dto/create-division.dto';

@Injectable()
export class DivisionsService {
  constructor(
    @InjectModel(Division)
    private readonly divisionModel: typeof Division,
  ) {}

  list(): Promise<Division[]> {
    return this.divisionModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<Division> {
    const record = await this.divisionModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Division ${id} not found`);
    }
    return record;
  }

  create(dto: CreateDivisionDto): Promise<Division> {
    return this.divisionModel.create(dto as any);
  }

  async update(id: string, dto: CreateDivisionDto): Promise<Division> {
    const record = await this.findByIdOrThrow(id);
    return record.update(dto);
  }

  async remove(id: string): Promise<void> {
    const record = await this.findByIdOrThrow(id);
    try {
      await record.destroy();
    } catch (error) {
      if (error instanceof ForeignKeyConstraintError) {
        throw new ConflictException(
          'This division is still assigned to one or more employees',
        );
      }
      throw error;
    }
  }
}
