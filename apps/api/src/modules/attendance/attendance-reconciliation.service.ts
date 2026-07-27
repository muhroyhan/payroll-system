import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AttendanceSource } from '@payroll-system/shared-types';
import type { AuditActor } from '../../common/audit/audit-actor';
import { Fingerprint } from '../fingerprints/entities/fingerprint.entity';
import { HolidaysService } from '../holidays/holidays.service';
import { LeaveRequestsService } from '../leave/leave-requests/leave-requests.service';
import { AttendanceRawLogsService } from './attendance-raw-logs.service';
import { AttendanceRecordsService } from './attendance-records.service';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { reconcileDay, RawScan } from './reconciliation-core';
import { PERMISSION_RESOLVER } from './permission-resolver.interface';
import type { PermissionResolver } from './permission-resolver.interface';

function dayBounds(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

@Injectable()
export class AttendanceReconciliationService {
  constructor(
    @InjectModel(Fingerprint)
    private readonly fingerprintModel: typeof Fingerprint,
    private readonly attendanceRawLogsService: AttendanceRawLogsService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly holidaysService: HolidaysService,
    private readonly leaveRequestsService: LeaveRequestsService,
    @Inject(PERMISSION_RESOLVER)
    private readonly permissionResolver: PermissionResolver,
  ) {}

  // §5.3 — the core operation: raw logs -> one attendance_records row for
  // this employee/date. Independent of the payslip engine (P3-T03).
  // `overwrite` mirrors AttendanceRecordsService.upsert's TC-ATT-07 guard —
  // a differently-sourced row on this date is rejected unless explicitly forced.
  async reconcileOne(
    employeeId: string,
    date: string,
    overwrite = false,
    actor: AuditActor | null = null,
    reason?: string | null,
  ): Promise<AttendanceRecord> {
    const scans = await this.collectScans(employeeId, date);

    const [holidays, leaveMatch] = await Promise.all([
      this.holidaysService.list(date, date),
      this.leaveRequestsService.findApprovedCoveringDate(employeeId, date),
    ]);
    const isHoliday = holidays.some((h) => h.isActive);
    const isOnLeave = leaveMatch !== null;
    const hasPermission = await this.permissionResolver.hasApprovedPermission(
      employeeId,
      date,
    );

    const reconciled = reconcileDay(scans, {
      isHoliday,
      isOnLeave,
      hasPermission,
    });

    return this.attendanceRecordsService.upsert(
      {
        employeeId,
        date,
        source: AttendanceSource.FINGERPRINT,
        ...reconciled,
      },
      overwrite,
      actor,
      reason,
    );
  }

  async reconcileRange(
    employeeId: string,
    from: string,
    to: string,
    overwrite = false,
    actor: AuditActor | null = null,
    reason?: string | null,
  ): Promise<AttendanceRecord[]> {
    const results: AttendanceRecord[] = [];
    for (const date of eachDate(from, to)) {
      results.push(
        await this.reconcileOne(employeeId, date, overwrite, actor, reason),
      );
    }
    return results;
  }

  private async collectScans(
    employeeId: string,
    date: string,
  ): Promise<RawScan[]> {
    const fingerprints = await this.fingerprintModel.findAll({
      where: { employeeId },
    });
    if (fingerprints.length === 0) {
      return [];
    }

    const { start, end } = dayBounds(date);
    const scanArrays = await Promise.all(
      fingerprints.map((fp) =>
        this.attendanceRawLogsService.findForDeviceUserAndDate(
          fp.deviceUserId,
          fp.deviceId,
          start,
          end,
        ),
      ),
    );

    return scanArrays.flat().map((log) => ({
      scanTime: log.scanTime,
      scanType: log.scanType,
    }));
  }
}
