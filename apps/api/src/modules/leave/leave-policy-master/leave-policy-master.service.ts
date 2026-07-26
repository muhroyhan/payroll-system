import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Role } from '@payroll-system/shared-types';
import { auditOptions } from '../../../common/audit/audit-actor';
import { EmployeesService } from '../../employees/employees.service';
import { ScopeResolverService } from '../../scope-resolver/scope-resolver.service';
import { ScopeValueValidator } from '../../scope-resolver/scope-value-validator.service';
import { ScopeResolution } from '../../scope-resolver/scope-resolver.types';
import { assertRetireReasonProvided } from '../../../common/effective-dating/retire-reason';
import { LeaveBalance } from '../leave-balances/entities/leave-balance.entity';
import { LeavePolicyMaster } from './entities/leave-policy-master.entity';
import { CreateLeavePolicyMasterDto } from './dto/create-leave-policy-master.dto';
import { UpdateLeavePolicyMasterDto } from './dto/update-leave-policy-master.dto';

@Injectable()
export class LeavePolicyMasterService {
  constructor(
    @InjectModel(LeavePolicyMaster)
    private readonly leavePolicyMasterModel: typeof LeavePolicyMaster,
    @InjectModel(LeaveBalance)
    private readonly leaveBalanceModel: typeof LeaveBalance,
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
    actorRole: Role,
  ): Promise<LeavePolicyMaster> {
    await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    return this.leavePolicyMasterModel.create(
      { ...dto, createdBy } as any,
      auditOptions({ id: createdBy, role: actorRole }),
    );
  }

  // §11 audit follow-up (dispute-traceability review, §1C) — this master was
  // previously the one gap among the 7: it's never consumed by payroll
  // calculation directly (grep payroll-calculation, it doesn't appear), only
  // via resolveForEmployee() below -> LeaveBalancesService.resolveOne(), and
  // that call site didn't persist which policy row it resolved, so there was
  // no reliable "has this row been used" check. Closed by adding
  // leave_balances.resolved_from_policy_id, set whenever resolveOne() actually
  // resolves a new balance row (see LeaveBalancesService) — an exact per-row
  // reference, the same shape as PayslipReferenceChecker's (source, source_id)
  // used by salary_master/incentive_master, just against leave_balances
  // instead of payslip_line_items.
  //
  // effectiveEndDate is deliberately NOT locked, same reasoning as
  // ptkp/ter-bracket/bpjs-*: closing a row's range off doesn't change any
  // balance already resolved from it — it only narrows which future periods
  // this row would still resolve for. A referenced row must stay closeable or
  // it can never be retired.
  async update(
    id: string,
    dto: UpdateLeavePolicyMasterDto,
    updatedBy: string,
    actorRole: Role,
  ): Promise<LeavePolicyMaster> {
    const record = await this.findByIdOrThrow(id);
    if (dto.scopeType && dto.scopeValue) {
      await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    }
    await this.assertLockedFieldsUntouched(record, dto);
    assertRetireReasonProvided(record, dto);
    return record.update(
      { ...dto, updatedBy },
      auditOptions({ id: updatedBy, role: actorRole }, dto.reason),
    );
  }

  private async assertLockedFieldsUntouched(
    record: LeavePolicyMaster,
    dto: UpdateLeavePolicyMasterDto,
  ): Promise<void> {
    const lockedFields: Array<keyof UpdateLeavePolicyMasterDto> = [
      'leaveTypeId',
      'scopeType',
      'scopeValue',
      'annualQuota',
      'effectiveStartDate',
    ];
    const touched = lockedFields.find((field) => dto[field] !== undefined);
    if (!touched) {
      return;
    }

    const referencedCount = await this.leaveBalanceModel.count({
      where: { resolvedFromPolicyId: record.id },
    });
    if (referencedCount > 0) {
      throw new ConflictException(
        `Leave policy master ${record.id}'s ${touched} is locked — it has ` +
          `already been resolved into at least one leave_balances row ` +
          `(§11/§1C); retire it via effectiveEndDate and add a new row ` +
          `instead of editing this one`,
      );
    }
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
