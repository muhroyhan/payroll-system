import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ScopeType } from '@payroll-system/shared-types';

export class CreateIncentiveMasterDto {
  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @IsUUID()
  scopeValue: string;

  @IsNumberString()
  incentiveAmount: string;

  // §9 Step 2 — fixed/recurring allowance → true, variable/one-off → false.
  @IsBoolean()
  isBpjsEligible: boolean;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;
}
