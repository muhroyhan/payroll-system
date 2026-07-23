import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ScanType } from '@payroll-system/shared-types';

export class CreateAttendanceRawLogDto {
  @IsString()
  @MinLength(1)
  deviceUserId: string;

  @IsString()
  @MinLength(1)
  deviceId: string;

  @IsDateString()
  scanTime: string;

  @IsOptional()
  @IsEnum(ScanType)
  scanType?: ScanType;
}
