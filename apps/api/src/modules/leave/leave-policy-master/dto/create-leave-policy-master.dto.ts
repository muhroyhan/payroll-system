import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ScopeType } from '@payroll-system/shared-types';

export class CreateLeavePolicyMasterDto {
  @IsUUID()
  leaveTypeId: string;

  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @IsUUID()
  scopeValue: string;

  @IsInt()
  @Min(0)
  annualQuota: number;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;
}
