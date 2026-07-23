import {
  IsDateString,
  IsEnum,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { SuratIjinType } from '@payroll-system/shared-types';

export class CreateSuratIjinDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsEnum(SuratIjinType)
  type: SuratIjinType;

  @IsString()
  @MinLength(1)
  reason: string;

  @IsString()
  @MinLength(1)
  timeRequested: string;
}
