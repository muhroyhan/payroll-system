import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ForeignKeyConstraintError } from 'sequelize';
import { Position } from './entities/position.entity';
import { CreatePositionDto } from './dto/create-position.dto';

@Injectable()
export class PositionsService {
  constructor(
    @InjectModel(Position)
    private readonly positionModel: typeof Position,
  ) {}

  list(): Promise<Position[]> {
    return this.positionModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<Position> {
    const record = await this.positionModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Position ${id} not found`);
    }
    return record;
  }

  create(dto: CreatePositionDto): Promise<Position> {
    return this.positionModel.create(dto as any);
  }

  async update(id: string, dto: CreatePositionDto): Promise<Position> {
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
          'This position is still assigned to one or more employees',
        );
      }
      throw error;
    }
  }
}
