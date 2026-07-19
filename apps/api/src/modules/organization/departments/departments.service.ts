import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ForeignKeyConstraintError } from 'sequelize';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department)
    private readonly departmentModel: typeof Department,
  ) {}

  list(): Promise<Department[]> {
    return this.departmentModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<Department> {
    const record = await this.departmentModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Department ${id} not found`);
    }
    return record;
  }

  create(dto: CreateDepartmentDto): Promise<Department> {
    return this.departmentModel.create(dto as any);
  }

  async update(id: string, dto: CreateDepartmentDto): Promise<Department> {
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
          'This department is still assigned to one or more employees',
        );
      }
      throw error;
    }
  }
}
