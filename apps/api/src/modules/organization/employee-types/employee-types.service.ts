import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ForeignKeyConstraintError } from 'sequelize';
import { EmployeeType } from './entities/employee-type.entity';
import { CreateEmployeeTypeDto } from './dto/create-employee-type.dto';

@Injectable()
export class EmployeeTypesService {
  constructor(
    @InjectModel(EmployeeType)
    private readonly employeeTypeModel: typeof EmployeeType,
  ) {}

  list(): Promise<EmployeeType[]> {
    return this.employeeTypeModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<EmployeeType> {
    const record = await this.employeeTypeModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Employee type ${id} not found`);
    }
    return record;
  }

  create(dto: CreateEmployeeTypeDto): Promise<EmployeeType> {
    return this.employeeTypeModel.create(dto as any);
  }

  async update(id: string, dto: CreateEmployeeTypeDto): Promise<EmployeeType> {
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
          'This employee type is still assigned to one or more employees',
        );
      }
      throw error;
    }
  }
}
