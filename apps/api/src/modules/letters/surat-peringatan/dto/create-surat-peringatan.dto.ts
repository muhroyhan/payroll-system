import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { SPLevel } from '@payroll-system/shared-types';

export class CreateSuratPeringatanDto {
  @IsUUID()
  employeeId: string;

  @IsEnum(SPLevel)
  level: SPLevel;

  @IsString()
  @MinLength(1)
  violationDescription: string;

  @IsDateString()
  issueDate: string;

  @IsOptional()
  @IsUUID()
  sanctionComponentId?: string;

  // Sanction is all-or-nothing: a component without an amount (or vice versa)
  // is a half-specified sanction, so both are required together.
  @ValidateIf((dto: CreateSuratPeringatanDto) => !!dto.sanctionComponentId)
  @IsNumberString()
  sanctionAmount?: string;

  @IsUUID()
  issuedBy: string;
}
