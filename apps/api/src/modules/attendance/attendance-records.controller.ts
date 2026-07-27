import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AttendanceRecordsService } from './attendance-records.service';
import { AttendanceReconciliationService } from './attendance-reconciliation.service';
import { CreateAttendanceRecordDto } from './dto/create-attendance-record.dto';
import { BulkCreateAttendanceRecordsDto } from './dto/bulk-create-attendance-records.dto';
import { ReconcileRangeDto } from './dto/reconcile-range.dto';

@Controller('attendance-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class AttendanceRecordsController {
  constructor(
    private readonly attendanceRecordsService: AttendanceRecordsService,
    private readonly attendanceReconciliationService: AttendanceReconciliationService,
  ) {}

  @Get()
  list(
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceRecordsService.list(employeeId, from, to);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceRecordsService.findByIdOrThrow(id);
  }

  // Runs the raw-log -> attendance_records reconciliation (P3-T03), source = fingerprint.
  @Post('reconcile')
  reconcile(
    @Body() dto: ReconcileRangeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceReconciliationService.reconcileRange(
      dto.employeeId,
      dto.from,
      dto.to,
      dto.overwrite ?? false,
      user,
      dto.reason,
    );
  }

  // Manual HR entry/correction, source = manual.
  @Post()
  create(
    @Body() dto: CreateAttendanceRecordDto,
    @Query('overwrite') overwrite: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceRecordsService.createManual(
      dto,
      overwrite === 'true',
      user,
    );
  }

  // Direct bulk import of already-reconciled rows from an external system, source = csv_import.
  @Post('csv-import')
  csvImport(
    @Body() dto: BulkCreateAttendanceRecordsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceRecordsService.bulkImportCsv(
      dto.records,
      dto.overwrite ?? false,
      user,
      dto.reason,
    );
  }
}
