import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { AttendanceSource } from '@payroll-system/shared-types';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { ReconciledDay } from './reconciliation-core';
import { CreateAttendanceRecordDto } from './dto/create-attendance-record.dto';

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
  ): Promise<AttendanceRecord> {
    const existing = await this.findByEmployeeAndDate(
      input.employeeId,
      input.date,
    );

    if (!existing) {
      return this.attendanceRecordModel.create({ ...input } as any);
    }

    if (existing.source !== input.source && !overwrite) {
      throw new ConflictException(
        `Attendance record for ${input.employeeId} on ${input.date} already exists from source ` +
          `"${existing.source}" — pass overwrite=true to replace it with "${input.source}"`,
      );
    }

    return existing.update({ ...input });
  }

  // Manual HR entry / correction (source = manual).
  createManual(
    dto: CreateAttendanceRecordDto,
    overwrite = false,
  ): Promise<AttendanceRecord> {
    return this.upsert(this.fromDto(dto, AttendanceSource.MANUAL), overwrite);
  }

  // Bulk direct import of already-reconciled rows from an external system
  // (source = csv_import) — TC-ATT-07's "CSV-imported attendance row".
  async bulkImportCsv(
    dtos: CreateAttendanceRecordDto[],
    overwrite = false,
  ): Promise<{ createdOrUpdated: number; conflicts: string[] }> {
    let createdOrUpdated = 0;
    const conflicts: string[] = [];
    for (const dto of dtos) {
      try {
        await this.upsert(
          this.fromDto(dto, AttendanceSource.CSV_IMPORT),
          overwrite,
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
