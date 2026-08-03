import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import { EmployeeType } from './entities/employee-type.entity';
import { CreateEmployeeTypeDto } from './dto/create-employee-type.dto';

@Injectable()
export class EmployeeTypesService {
  constructor(
    @InjectModel(EmployeeType)
    private readonly employeeTypeModel: typeof EmployeeType,
  ) {}

  list(): Promise<EmployeeType[]> {
    // BUGS#3 — newest-updated first, the default for every listing.
    return this.employeeTypeModel.findAll({ order: [['updatedAt', 'DESC']] });
  }

  async findByIdOrThrow(id: string): Promise<EmployeeType> {
    const record = await this.employeeTypeModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Employee type ${id} not found`);
    }
    return record;
  }

  async create(dto: CreateEmployeeTypeDto): Promise<EmployeeType> {
    try {
      return await this.employeeTypeModel.create(dto as any);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(
          'An employee type with this name already exists',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: CreateEmployeeTypeDto): Promise<EmployeeType> {
    const record = await this.findByIdOrThrow(id);
    try {
      return await record.update(dto);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(
          'An employee type with this name already exists',
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const record = await this.findByIdOrThrow(id);
    try {
      await record.destroy();
    } catch (error) {
      if (error instanceof ForeignKeyConstraintError) {
        throw new ConflictException(
          'This employee type is still assigned to one or more employees',
        );
      }
      throw error;
    }
  }
}
