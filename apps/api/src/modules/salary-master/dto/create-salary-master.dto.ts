import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ScopeType } from '@payroll-system/shared-types';

export class CreateSalaryMasterDto {
  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @IsUUID()
  scopeValue: string;

  @IsNumberString()
  baseSalary: string;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;
}
