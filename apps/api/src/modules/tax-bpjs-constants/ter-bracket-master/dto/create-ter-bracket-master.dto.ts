import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
} from 'class-validator';
import { TerCategory } from '@payroll-system/shared-types';

export class CreateTerBracketMasterDto {
  @IsEnum(TerCategory)
  terCategory: TerCategory;

  @IsNumberString()
  incomeLowerBound: string;

  @IsOptional()
  @IsNumberString()
  incomeUpperBound?: string;

  @IsNumberString()
  rate: string;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;
}
