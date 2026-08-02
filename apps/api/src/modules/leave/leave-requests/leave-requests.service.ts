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

  async create(
    dto: CreateLeaveRequestDto,
    createdBy: string,
  ): Promise<LeaveRequest> {
    this.assertDateRangeValid(dto.startDate, dto.endDate);
    await this.assertLeaveBalanceExistsForYears(
      dto.employeeId,
      dto.leaveTypeId,
      dto.startDate,
      dto.endDate,
    );
    return this.leaveRequestModel.create({
      ...dto,
      status: LeaveRequestStatus.PENDING,
      createdBy,
    } as any);
  }

  async update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest> {
    const record = await this.assertPending(id);
    const startDate = dto.startDate ?? record.startDate;
    const endDate = dto.endDate ?? record.endDate;
    this.assertDateRangeValid(startDate, endDate);
    await this.assertLeaveBalanceExistsForYears(
      dto.employeeId ?? record.employeeId,
      dto.leaveTypeId ?? record.leaveTypeId,
      startDate,
      endDate,
    );
    return record.update(dto);
  }

  // LEAVEREQ-009 — moved from "only discovered at approve()" to "rejected
  // outright at create()"; a request for a year nobody has seeded a balance
  // for yet can't be filed at all now, rather than sitting pending until
  // someone tries to approve it. Existence-only (LeaveBalancesService.
  // existsForYear, not resolveOne) — whether the remaining quota is
  // *sufficient* stays approve()'s job (LEAVEREQ-003), same division of
  // labor as before, just the "does a balance even exist" half moved
  // earlier. Checks every calendar year the [startDate, endDate] range
  // touches, not just the start year, so a request straddling a year
  // boundary (e.g. 30 Dec–3 Jan) needs a balance on both sides of it.
  private async assertLeaveBalanceExistsForYears(
    employeeId: string,
    leaveTypeId: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    const startYear = Number(startDate.slice(0, 4));
    const endYear = Number(endDate.slice(0, 4));
    for (let year = startYear; year <= endYear; year += 1) {
      const exists = await this.leaveBalancesService.existsForYear(
        employeeId,
        leaveTypeId,
        year,
      );
      if (!exists) {
        throw new ConflictException('Tidak Ada Saldo Cuti di tahun ini');
      }
    }
  }

  // LEAVEREQ-008 — startDate > endDate was accepted outright (no cross-field
  // check anywhere between the DTO and countWeekdaysInclusive, which just
  // loops zero times for an inverted range and silently produces 0 days).
  private assertDateRangeValid(startDate: string, endDate: string): void {
    if (startDate > endDate) {
      throw new ConflictException(
        'Tanggal awal cuti tidak boleh melampaui tanggal akhir cuti',
      );
    }
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

  async reject(
    id: string,
    rejectedBy: string,
    rejectReason: string,
  ): Promise<LeaveRequest> {
    const record = await this.assertPending(id);
    return record.update({
      status: LeaveRequestStatus.REJECTED,
      rejectedBy,
      rejectReason,
    });
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
