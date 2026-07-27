import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

// Direct entry path for attendance_records — manual HR correction or a
// CSV-imported row from an external attendance system (source is set by the
// service based on which endpoint is called, not by the client).
export class CreateAttendanceRecordDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsBoolean()
  isHoliday?: boolean;

  @IsOptional()
  @IsBoolean()
  isOnLeave?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPermission?: boolean;

  // Audit-trail follow-up (§D) — optional context for why this entry was
  // made, most useful on a manual correction or a cross-source overwrite;
  // stored on the audit_events row, not on attendance_records itself.
  @IsOptional()
  @IsString()
  reason?: string;
}
