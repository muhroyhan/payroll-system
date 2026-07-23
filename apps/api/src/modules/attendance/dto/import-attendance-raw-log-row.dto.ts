import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ScanType } from '@payroll-system/shared-types';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

// Spreadsheet row shape for the file-based ingestion path (P3-T02) — a device
// export dumped to CSV/Excel, as opposed to the API-push path (bulk create).
export class ImportAttendanceRawLogRowDto {
  @IsString()
  @MinLength(1)
  deviceUserId: string;

  @IsString()
  @MinLength(1)
  deviceId: string;

  @IsDateString()
  scanTime: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(ScanType)
  scanType?: ScanType;
}
