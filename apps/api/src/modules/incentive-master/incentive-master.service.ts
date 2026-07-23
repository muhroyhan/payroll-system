import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EmployeesService } from '../employees/employees.service';
import { ScopeResolverService } from '../scope-resolver/scope-resolver.service';
import { ScopeValueValidator } from '../scope-resolver/scope-value-validator.service';
import { ScopeResolution } from '../scope-resolver/scope-resolver.types';
import { IncentiveMaster } from './entities/incentive-master.entity';
import { CreateIncentiveMasterDto } from './dto/create-incentive-master.dto';
import { UpdateIncentiveMasterDto } from './dto/update-incentive-master.dto';

@Injectable()
export class IncentiveMasterService {
  constructor(
    @InjectModel(IncentiveMaster)
    private readonly incentiveMasterModel: typeof IncentiveMaster,
    private readonly scopeResolver: ScopeResolverService,
    private readonly scopeValueValidator: ScopeValueValidator,
    private readonly employeesService: EmployeesService,
  ) {}

  list(): Promise<IncentiveMaster[]> {
    return this.incentiveMasterModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<IncentiveMaster> {
    const record = await this.incentiveMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Incentive master ${id} not found`);
    }
    return record;
  }

  async create(
    dto: CreateIncentiveMasterDto,
    createdBy: string,
  ): Promise<IncentiveMaster> {
    await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    return this.incentiveMasterModel.create({ ...dto, createdBy } as any);
  }

  async update(
    id: string,
    dto: UpdateIncentiveMasterDto,
  ): Promise<IncentiveMaster> {
    const record = await this.findByIdOrThrow(id);
    if (dto.scopeType && dto.scopeValue) {
      await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    }
    return record.update(dto);
  }

  // §5.2 — resolve the incentive that applies to one employee for a period.
  async resolveForEmployee(
    employeeId: string,
    periodDate: string,
  ): Promise<ScopeResolution<IncentiveMaster>> {
    const context = await this.employeesService.getScopeContext(employeeId);
    return this.scopeResolver.resolve(
      this.incentiveMasterModel,
      context,
      periodDate,
    );
  }
}
