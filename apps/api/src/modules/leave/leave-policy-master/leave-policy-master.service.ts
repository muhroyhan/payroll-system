import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EmployeesService } from '../../employees/employees.service';
import { ScopeResolverService } from '../../scope-resolver/scope-resolver.service';
import { ScopeValueValidator } from '../../scope-resolver/scope-value-validator.service';
import { ScopeResolution } from '../../scope-resolver/scope-resolver.types';
import { LeavePolicyMaster } from './entities/leave-policy-master.entity';
import { CreateLeavePolicyMasterDto } from './dto/create-leave-policy-master.dto';
import { UpdateLeavePolicyMasterDto } from './dto/update-leave-policy-master.dto';

@Injectable()
export class LeavePolicyMasterService {
  constructor(
    @InjectModel(LeavePolicyMaster)
    private readonly leavePolicyMasterModel: typeof LeavePolicyMaster,
    private readonly scopeResolver: ScopeResolverService,
    private readonly scopeValueValidator: ScopeValueValidator,
    private readonly employeesService: EmployeesService,
  ) {}

  list(): Promise<LeavePolicyMaster[]> {
    return this.leavePolicyMasterModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<LeavePolicyMaster> {
    const record = await this.leavePolicyMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Leave policy master ${id} not found`);
    }
    return record;
  }

  async create(
    dto: CreateLeavePolicyMasterDto,
    createdBy: string,
  ): Promise<LeavePolicyMaster> {
    await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    return this.leavePolicyMasterModel.create({ ...dto, createdBy } as any);
  }

  async update(
    id: string,
    dto: UpdateLeavePolicyMasterDto,
  ): Promise<LeavePolicyMaster> {
    const record = await this.findByIdOrThrow(id);
    if (dto.scopeType && dto.scopeValue) {
      await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    }
    return record.update(dto);
  }

  // §5.4 — resolve the leave quota for one employee + leave type for a period.
  // leave_type_id narrows the table before scope matching (extraWhere).
  async resolveForEmployee(
    employeeId: string,
    leaveTypeId: string,
    periodDate: string,
  ): Promise<ScopeResolution<LeavePolicyMaster>> {
    const context = await this.employeesService.getScopeContext(employeeId);
    return this.scopeResolver.resolve(
      this.leavePolicyMasterModel,
      context,
      periodDate,
      {
        leaveTypeId,
      },
    );
  }
}
