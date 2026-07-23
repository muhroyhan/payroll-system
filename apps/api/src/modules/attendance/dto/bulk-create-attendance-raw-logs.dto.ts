import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateAttendanceRawLogDto } from './create-attendance-raw-log.dto';

// The "API pull" ingestion path (P3-T02): an external script/cron authenticates
// and POSTs a batch of scans it pulled from the device's own export mechanism.
export class BulkCreateAttendanceRawLogsDto {
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceRawLogDto)
  @ArrayMinSize(1)
  logs: CreateAttendanceRawLogDto[];
}
