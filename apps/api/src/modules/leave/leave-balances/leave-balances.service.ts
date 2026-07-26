import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EmployeeActiveStatus } from '@payroll-system/shared-types';
import { Employee } from '../../employees/entities/employee.entity';
import { LeavePolicyMasterService } from '../leave-policy-master/leave-policy-master.service';
import { LeaveBalance } from './entities/leave-balance.entity';
import { UpdateLeaveBalanceQuotaDto } from './dto/update-leave-balance-quota.dto';

export interface ResolveLeaveBalanceRowResult {
  employeeId: string;
  ok: boolean;
  balanceId?: string;
  message?: string;
}

@Injectable()
export class LeaveBalancesService {
  constructor(
    @InjectModel(LeaveBalance)
    private readonly leaveBalanceModel: typeof LeaveBalance,
    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,
    private readonly leavePolicyMasterService: LeavePolicyMasterService,
  ) {}

  list(employeeId?: string, year?: number): Promise<LeaveBalance[]> {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (year) where.year = year;
    return this.leaveBalanceModel.findAll({ where, include: ['leaveType'] });
  }

  async findByIdOrThrow(id: string): Promise<LeaveBalance> {
    const record = await this.leaveBalanceModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Leave balance ${id} not found`);
    }
    return record;
  }

  // §5.4 — idempotent: if a balance row already exists for this
  // employee+leaveType+year, it's returned unchanged (never clobbers a
  // manually-adjusted quota by re-resolving).
  async resolveOne(
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<LeaveBalance> {
    const existing = await this.leaveBalanceModel.findOne({
      where: { employeeId, leaveTypeId, year },
    });
    if (existing) {
      return existing;
    }

    const resolution = await this.leavePolicyMasterService.resolveForEmployee(
      employeeId,
      leaveTypeId,
      `${year}-01-01`,
    );
    if (!resolution.resolved) {
      throw new NotFoundException(
        `No leave_policy_master rule resolves for employee ${employeeId}, leaveType ${leaveTypeId}, year ${year} — configure a policy before resolving balances`,
      );
    }

    return this.leaveBalanceModel.create({
      employeeId,
      leaveTypeId,
      year,
      quota: resolution.record.annualQuota,
      used: 0,
      manuallyAdjusted: false,
      resolvedFromPolicyId: resolution.record.id,
    } as any);
  }

  // Bulk year-start initialization across every active employee.
  async resolveForLeaveType(
    leaveTypeId: string,
    year: number,
  ): Promise<ResolveLeaveBalanceRowResult[]> {
    const employees = await this.employeeModel.findAll({
      where: { status: EmployeeActiveStatus.ACTIVE },
    });

    const results: ResolveLeaveBalanceRowResult[] = [];
    for (const employee of employees) {
      try {
        const balance = await this.resolveOne(employee.id, leaveTypeId, year);
        results.push({
          employeeId: employee.id,
          ok: true,
          balanceId: balance.id,
        });
      } catch (error) {
        results.push({
          employeeId: employee.id,
          ok: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return results;
  }

  // HR direct edit — always marks manuallyAdjusted (§5.4/TC-LEAVE-02).
  // Audit-trail follow-up (§1C) — adjustedBy/adjustmentReason recorded
  // together, same shape as every other actor+reason pair in this codebase.
  async updateQuota(
    id: string,
    dto: UpdateLeaveBalanceQuotaDto,
    adjustedBy: string,
  ): Promise<LeaveBalance> {
    const record = await this.findByIdOrThrow(id);
    return record.update({
      quota: dto.quota,
      manuallyAdjusted: true,
      adjustedBy,
      adjustmentReason: dto.reason,
    });
  }

  // Called only by the leave_requests approval workflow (§11) — never exposed
  // directly as a controller route.
  async incrementUsed(id: string, days: number): Promise<LeaveBalance> {
    const record = await this.findByIdOrThrow(id);
    return record.update({ used: record.used + days });
  }
}
