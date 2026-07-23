import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { TerCategory } from '@payroll-system/shared-types';

// TER's effective-resolution query carries an optional category alongside asOf.
// Needs its own DTO because the global validation pipe runs forbidNonWhitelisted,
// so `category` must be a declared property to survive.
export class TerEffectiveQueryDto {
  @IsOptional()
  @IsDateString()
  asOf?: string;

  @IsOptional()
  @IsEnum(TerCategory)
  category?: TerCategory;
}
