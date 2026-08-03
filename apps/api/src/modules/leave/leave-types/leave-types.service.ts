import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import { LeaveType } from './entities/leave-type.entity';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';

@Injectable()
export class LeaveTypesService {
  constructor(
    @InjectModel(LeaveType)
    private readonly leaveTypeModel: typeof LeaveType,
  ) {}

  list(): Promise<LeaveType[]> {
    // BUGS#3 — newest-updated first, the default for every listing.
    return this.leaveTypeModel.findAll({ order: [['updatedAt', 'DESC']] });
  }

  async findByIdOrThrow(id: string): Promise<LeaveType> {
    const record = await this.leaveTypeModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Leave type ${id} not found`);
    }
    return record;
  }

  async create(dto: CreateLeaveTypeDto): Promise<LeaveType> {
    try {
      return await this.leaveTypeModel.create(dto as any);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(
          'A leave type with this name already exists',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: CreateLeaveTypeDto): Promise<LeaveType> {
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
          'This leave type is still referenced by a leave policy or request',
        );
      }
      throw error;
    }
  }
}
