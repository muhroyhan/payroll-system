import {
  IsEnum,
  IsInt,
  IsNumberString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ScopeType } from '@payroll-system/shared-types';

export class CreatePayslipTempComponentDto {
  @IsUUID()
  componentId: string;

  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @IsUUID()
  scopeValue: string;

  @IsNumberString()
  amount: string;

  // No "not in the past" / "not too far in the future" restriction — §5.2
  // doesn't mention one, so none is assumed. Only structural sanity (a real
  // 4-digit year, a real calendar month) is enforced.
  @IsInt()
  @Min(2000)
  periodYear: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;
}
