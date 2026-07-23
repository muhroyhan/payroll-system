import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EmployeesService } from '../employees/employees.service';
import { ScopeResolverService } from '../scope-resolver/scope-resolver.service';
import { ScopeValueValidator } from '../scope-resolver/scope-value-validator.service';
import { ScopeResolution } from '../scope-resolver/scope-resolver.types';
import { SalaryMaster } from './entities/salary-master.entity';
import { CreateSalaryMasterDto } from './dto/create-salary-master.dto';
import { UpdateSalaryMasterDto } from './dto/update-salary-master.dto';

@Injectable()
export class SalaryMasterService {
  constructor(
    @InjectModel(SalaryMaster)
    private readonly salaryMasterModel: typeof SalaryMaster,
    private readonly scopeResolver: ScopeResolverService,
    private readonly scopeValueValidator: ScopeValueValidator,
    private readonly employeesService: EmployeesService,
  ) {}

  list(): Promise<SalaryMaster[]> {
    return this.salaryMasterModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<SalaryMaster> {
    const record = await this.salaryMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Salary master ${id} not found`);
    }
    return record;
  }

  async create(
    dto: CreateSalaryMasterDto,
    createdBy: string,
  ): Promise<SalaryMaster> {
    await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    return this.salaryMasterModel.create({ ...dto, createdBy } as any);
  }

  async update(id: string, dto: UpdateSalaryMasterDto): Promise<SalaryMaster> {
    const record = await this.findByIdOrThrow(id);
    if (dto.scopeType && dto.scopeValue) {
      await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    }
    return record.update(dto);
  }

  // §5.2 — resolve the base salary that applies to one employee for a period.
  async resolveForEmployee(
    employeeId: string,
    periodDate: string,
  ): Promise<ScopeResolution<SalaryMaster>> {
    const context = await this.employeesService.getScopeContext(employeeId);
    return this.scopeResolver.resolve(
      this.salaryMasterModel,
      context,
      periodDate,
    );
  }
}
