import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HolidaysModule } from '../holidays/holidays.module';
import { LeaveModule } from '../leave/leave.module';
import { PayrollPeriodLockModule } from '../payroll-runs/payroll-period-lock.module';
import { SuratIjinModule } from '../letters/surat-ijin/surat-ijin.module';
import { SuratIjinPermissionResolver } from '../letters/surat-ijin/surat-ijin-permission-resolver.service';
import { Fingerprint } from '../fingerprints/entities/fingerprint.entity';
import { AttendanceRawLog } from './entities/attendance-raw-log.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { AttendanceRawLogsService } from './attendance-raw-logs.service';
import { AttendanceRawLogsImportService } from './attendance-raw-logs-import.service';
import { AttendanceRawLogsController } from './attendance-raw-logs.controller';
import { AttendanceRecordsService } from './attendance-records.service';
import { AttendanceRecordsController } from './attendance-records.controller';
import { AttendanceReconciliationService } from './attendance-reconciliation.service';
import { PERMISSION_RESOLVER } from './permission-resolver.interface';

// §5.3 — fingerprints CRUD lives in its own module (../fingerprints); this
// module owns raw-log ingestion, reconciliation, and attendance_records.
@Module({
  imports: [
    SequelizeModule.forFeature([
      Fingerprint,
      AttendanceRawLog,
      AttendanceRecord,
    ]),
    HolidaysModule,
    LeaveModule,
    SuratIjinModule,
    // §11 / TC-PAYROLL-04 — the period-lock check for attendance edits.
    PayrollPeriodLockModule,
  ],
  controllers: [AttendanceRawLogsController, AttendanceRecordsController],
  providers: [
    AttendanceRawLogsService,
    AttendanceRawLogsImportService,
    AttendanceRecordsService,
    AttendanceReconciliationService,
    // P4-T04 — swapped from NoPermissionResolver to the real surat_ijin-backed
    // implementation. DI binding only; AttendanceReconciliationService is
    // untouched — it only ever depends on the PermissionResolver interface.
    { provide: PERMISSION_RESOLVER, useExisting: SuratIjinPermissionResolver },
  ],
  exports: [AttendanceRecordsService, AttendanceReconciliationService],
})
export class AttendanceModule {}
