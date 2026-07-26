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

  // §11 audit note (deliberately NOT guarded — see rationale below): §11 groups
  // leave_policy_master with salary_master/incentive_master under "past payroll
  // runs must stay reproducible," but unlike those two, this row is never
  // consumed by payroll calculation at all — grep the payroll-calculation
  // module and it doesn't appear. The only consumer is resolveForEmployee()
  // below, called from LeaveBalancesService.resolveOne() to seed a
  // leave_balances row's `quota` — and that call site does NOT persist which
  // policy row produced it (no foreign key from leave_balances back here), so
  // there is no reliable way to ask "has this exact row already been used."
  //
  // Two ways were considered and rejected instead of guessing:
  //  1. A period+leaveType-only check (year within effectiveStartDate/
  //     effectiveEndDate) ignoring scope — but scopeType/scopeValue can pick a
  //     DIFFERENT overlapping row for the same leaveType+year (§5.2 priority:
  //     employee > division > department > position > employee_type), so this
  //     would sometimes lock a row that was never actually resolved for the
  //     balance in question — exactly the "fabricated restriction" this audit
  //     fix was told to avoid.
  //  2. Re-running scopeResolver.resolve() per existing leave_balances row to
  //     check if it would still select this row — accurate, but requires
  //     injecting LeaveBalance into this service, and LeaveBalancesService
  //     already depends on LeavePolicyMasterService (resolveForEmployee) —
  //     a circular module dependency (LeavePolicyMasterModule ->
  //     LeaveBalancesModule -> LeavePolicyMasterModule) with no clean forwardRef
  //     seam here, not a same-shape drop-in like the other 6 services.
  //
  // Reported to the user rather than shipped as either a no-op or a
  // wrong-in-either-direction lock. Real fix needs a product/schema decision:
  // add `resolved_from_policy_id` to leave_balances (enables option 2 cleanly),
  // or confirm leave is intentionally excluded from the §11 reproducibility
  // guarantee since it never reaches a payslip.
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
