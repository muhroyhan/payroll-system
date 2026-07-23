import { Type } from 'class-transformer';
import { ArrayMinSize, IsOptional, ValidateNested } from 'class-validator';
import { CreateAttendanceRecordDto } from './create-attendance-record.dto';

export class BulkCreateAttendanceRecordsDto {
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceRecordDto)
  @ArrayMinSize(1)
  records: CreateAttendanceRecordDto[];

  @IsOptional()
  overwrite?: boolean;
}
