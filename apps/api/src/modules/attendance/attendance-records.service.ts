import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { AttendanceSource } from '@payroll-system/shared-types';
import { auditOptions, type AuditActor } from '../../common/audit/audit-actor';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { ReconciledDay } from './reconciliation-core';
import { CreateAttendanceRecordDto } from './dto/create-attendance-record.dto';
import { PayrollPeriodLockService } from '../payroll-runs/payroll-period-lock.service';

export interface UpsertAttendanceRecordInput extends ReconciledDay {
  employeeId: string;
  date: string;
  source: AttendanceSource;
}

@Injectable()
export class AttendanceRecordsService {
  constructor(
    @InjectModel(AttendanceRecord)
    private readonly attendanceRecordModel: typeof AttendanceRecord,
    private readonly payrollPeriodLock: PayrollPeriodLockService,
  ) {}

  list(
    employeeId?: string,
    from?: string,
    to?: string,
  ): Promise<AttendanceRecord[]> {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (from && to) {
      where.date = { [Op.between]: [from, to] };
    }
    return this.attendanceRecordModel.findAll({
      where,
      order: [['date', 'ASC']],
    });
  }

  async findByIdOrThrow(id: string): Promise<AttendanceRecord> {
    const record = await this.attendanceRecordModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Attendance record ${id} not found`);
    }
    return record;
  }

  findByEmployeeAndDate(
    employeeId: string,
    date: string,
  ): Promise<AttendanceRecord | null> {
    return this.attendanceRecordModel.findOne({ where: { employeeId, date } });
  }

  /**
   * TC-ATT-07 — exactly one attendance_records row per (employee, date),
   * regardless of source. Re-running the SAME source (e.g. re-reconciling
   * fingerprint data after a raw-log correction) updates in place. A
   * DIFFERENT source colliding on the same day is rejected by default —
   * pass `overwrite: true` to explicitly replace it (never silent).
   */
  async upsert(
    input: UpsertAttendanceRecordInput,
    overwrite = false,
    actor: AuditActor | null = null,
    reason?: string | null,
  ): Promise<AttendanceRecord> {
    // §11 / TC-PAYROLL-04 — a period whose payroll run is past `draft` is
    // locked: no create/update/reconcile of its attendance until the run is
    // reverted to draft. All three write paths (manual, csv import,
    // reconciliation) funnel through upsert, so this one guard covers them.
    await this.payrollPeriodLock.assertPeriodEditable(input.date.slice(0, 7));

    const existing = await this.findByEmployeeAndDate(
      input.employeeId,
      input.date,
    );

    // Audit-trail follow-up (§D) — enteredBy reflects who authored the data
    // CURRENTLY on the row: set only when this write's own source is manual,
    // null otherwise (a csv_import/fingerprint write is never "manually
    // entered", even if it replaces a row that once was).
    const enteredBy =
      input.source === AttendanceSource.MANUAL ? actor?.id ?? null : null;

    if (!existing) {
      return this.attendanceRecordModel.create(
        { ...input, enteredBy, overwrittenBy: null } as any,
        auditOptions(actor, reason),
      );
    }

    const isCrossSourceOverwrite = existing.source !== input.source;
    if (isCrossSourceOverwrite && !overwrite) {
      throw new ConflictException(
        `Attendance record for ${input.employeeId} on ${input.date} already exists from source ` +
          `"${existing.source}" — pass overwrite=true to replace it with "${input.source}"`,
      );
    }

    return existing.update(
      {
        ...input,
        enteredBy,
        // Only this exact write actually performed a cross-source overwrite —
        // a same-source in-place update (e.g. re-reconciling) is not one, so
        // it clears any earlier overwrite marker rather than leaving it stale.
        overwrittenBy: isCrossSourceOverwrite ? actor?.id ?? null : null,
      },
      auditOptions(actor, reason),
    );
  }

  // Manual HR entry / correction (source = manual).
  createManual(
    dto: CreateAttendanceRecordDto,
    overwrite = false,
    actor: AuditActor | null = null,
  ): Promise<AttendanceRecord> {
    return this.upsert(
      this.fromDto(dto, AttendanceSource.MANUAL),
      overwrite,
      actor,
      dto.reason,
    );
  }

  // Bulk direct import of already-reconciled rows from an external system
  // (source = csv_import) — TC-ATT-07's "CSV-imported attendance row".
  async bulkImportCsv(
    dtos: CreateAttendanceRecordDto[],
    overwrite = false,
    actor: AuditActor | null = null,
    reason?: string | null,
  ): Promise<{ createdOrUpdated: number; conflicts: string[] }> {
    let createdOrUpdated = 0;
    const conflicts: string[] = [];
    for (const dto of dtos) {
      try {
        await this.upsert(
          this.fromDto(dto, AttendanceSource.CSV_IMPORT),
          overwrite,
          actor,
          reason,
        );
        createdOrUpdated += 1;
      } catch (error) {
        conflicts.push(
          `${dto.employeeId}/${dto.date}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }
    return { createdOrUpdated, conflicts };
  }

  private fromDto(
    dto: CreateAttendanceRecordDto,
    source: AttendanceSource,
  ): UpsertAttendanceRecordInput {
    return {
      employeeId: dto.employeeId,
      date: dto.date,
      source,
      clockIn: dto.clockIn ? new Date(dto.clockIn) : null,
      clockOut: dto.clockOut ? new Date(dto.clockOut) : null,
      overtimeHours: dto.overtimeHours ?? 0,
      hasMissedClockOut: !dto.clockIn !== !dto.clockOut, // exactly one of the two is set
      isHoliday: dto.isHoliday ?? false,
      isOnLeave: dto.isOnLeave ?? false,
      hasPermission: dto.hasPermission ?? false,
    };
  }
}
