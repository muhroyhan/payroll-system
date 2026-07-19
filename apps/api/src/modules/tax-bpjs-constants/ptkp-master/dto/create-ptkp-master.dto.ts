import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
} from 'class-validator';
import { PtkpStatus } from '@payroll-system/shared-types';

export class CreatePtkpMasterDto {
  @IsEnum(PtkpStatus)
  ptkpStatus: PtkpStatus;

  @IsNumberString()
  amount: string;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;
}
