import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateAttendanceRecordDto } from './create-attendance-record.dto';

export class BulkCreateAttendanceRecordsDto {
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceRecordDto)
  @ArrayMinSize(1)
  records: CreateAttendanceRecordDto[];

  @IsOptional()
  overwrite?: boolean;

  // Audit-trail follow-up (§D) — one reason for the whole batch, attached to
  // every audit_events row this import writes.
  @IsOptional()
  @IsString()
  reason?: string;
}
