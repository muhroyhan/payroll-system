import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { LeaveRequestStatus } from '@payroll-system/shared-types';
import { assertPendingStatus } from '../../../common/approval-workflow/assert-pending';
import { LeaveBalancesService } from '../leave-balances/leave-balances.service';
import { LeaveRequest } from './entities/leave-request.entity';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';

// §4 — standard Mon–Fri work week; weekends are never working days, so they
// never consume leave quota. Company holidays are NOT excluded here (would
// require cross-referencing the holidays master per request) — a documented
// simplification, not an oversight.
function countWeekdaysInclusive(startDate: string, endDate: string): number {
  let count = 0;
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    const day = cursor.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

@Injectable()
export class LeaveRequestsService {
  constructor(
    @InjectModel(LeaveRequest)
    private readonly leaveRequestModel: typeof LeaveRequest,
    private readonly leaveBalancesService: LeaveBalancesService,
  ) {}

  list(employeeId?: string): Promise<LeaveRequest[]> {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    return this.leaveRequestModel.findAll({ where, include: ['leaveType'] });
  }

  // Used by attendance reconciliation (P3-T03) to resolve is_on_leave for a date.
  findApprovedCoveringDate(
    employeeId: string,
    date: string,
  ): Promise<LeaveRequest | null> {
    return this.leaveRequestModel.findOne({
      where: {
        employeeId,
        status: LeaveRequestStatus.APPROVED,
        startDate: { [Op.lte]: date },
        endDate: { [Op.gte]: date },
      },
    });
  }

  async findByIdOrThrow(id: string): Promise<LeaveRequest> {
    const record = await this.leaveRequestModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Leave request ${id} not found`);
    }
    return record;
  }

  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    return this.leaveRequestModel.create({
      ...dto,
      status: LeaveRequestStatus.PENDING,
    } as any);
  }

  async update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest> {
    const record = await this.assertPending(id);
    return record.update(dto);
  }

  async remove(id: string): Promise<void> {
    const record = await this.assertPending(id);
    await record.destroy();
  }

  // §11 / TC-LEAVE-04 — rejects the approval outright if it would push
  // used > quota; HR must adjust the balance or the request first.
  async approve(id: string, approvedBy: string): Promise<LeaveRequest> {
    const record = await this.assertPending(id);
    const year = Number(record.startDate.slice(0, 4));

    const balance = await this.leaveBalancesService.resolveOne(
      record.employeeId,
      record.leaveTypeId,
      year,
    );

    const requestedDays = countWeekdaysInclusive(
      record.startDate,
      record.endDate,
    );
    const remaining = balance.quota - balance.used;
    if (requestedDays > remaining) {
      throw new ConflictException(
        `Approving this request needs ${requestedDays} day(s) but only ${remaining} remain (quota ${balance.quota}, used ${balance.used})`,
      );
    }

    await this.leaveBalancesService.incrementUsed(balance.id, requestedDays);
    return record.update({ status: LeaveRequestStatus.APPROVED, approvedBy });
  }

  async reject(id: string): Promise<LeaveRequest> {
    const record = await this.assertPending(id);
    return record.update({ status: LeaveRequestStatus.REJECTED });
  }

  private async assertPending(id: string): Promise<LeaveRequest> {
    const record = await this.findByIdOrThrow(id);
    assertPendingStatus(
      record.status,
      LeaveRequestStatus.PENDING,
      'Leave request',
      id,
    );
    return record;
  }
}
