import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, UniqueConstraintError } from 'sequelize';
import { HolidaySource } from '@payroll-system/shared-types';
import { Holiday } from './entities/holiday.entity';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(
    @InjectModel(Holiday)
    private readonly holidayModel: typeof Holiday,
  ) {}

  // Optional [from,to] range filter (inclusive) — payroll/attendance queries by month.
  list(from?: string, to?: string): Promise<Holiday[]> {
    const where: Record<string, unknown> = {};
    if (from && to) {
      where.date = { [Op.between]: [from, to] };
    } else if (from) {
      where.date = { [Op.gte]: from };
    } else if (to) {
      where.date = { [Op.lte]: to };
    }
    return this.holidayModel.findAll({ where, order: [['date', 'ASC']] });
  }

  async findByIdOrThrow(id: string): Promise<Holiday> {
    const record = await this.holidayModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Holiday ${id} not found`);
    }
    return record;
  }

  async create(dto: CreateHolidayDto): Promise<Holiday> {
    try {
      return await this.holidayModel.create({
        ...dto,
        source: HolidaySource.MANUAL,
      } as any);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(`A holiday already exists on ${dto.date}`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateHolidayDto): Promise<Holiday> {
    const record = await this.findByIdOrThrow(id);
    try {
      return await record.update(dto);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(
          `A holiday already exists on ${dto.date ?? record.date}`,
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const record = await this.findByIdOrThrow(id);
    await record.destroy();
  }
}
