import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department)
    private readonly departmentModel: typeof Department,
  ) {}

  list(): Promise<Department[]> {
    // BUGS#3 — newest-updated first, the default for every listing.
    return this.departmentModel.findAll({ order: [['updatedAt', 'DESC']] });
  }

  async findByIdOrThrow(id: string): Promise<Department> {
    const record = await this.departmentModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Department ${id} not found`);
    }
    return record;
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    try {
      return await this.departmentModel.create(dto as any);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('A department with this name already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: CreateDepartmentDto): Promise<Department> {
    const record = await this.findByIdOrThrow(id);
    try {
      return await record.update(dto);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('A department with this name already exists');
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
          'This department is still assigned to one or more employees',
        );
      }
      throw error;
    }
  }
}
