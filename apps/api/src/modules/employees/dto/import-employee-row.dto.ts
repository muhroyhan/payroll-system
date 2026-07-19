import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  EmployeeActiveStatus,
  EmploymentStatus,
  MaritalStatus,
  MAX_DEPENDENT_COUNT,
  PtkpStatus,
} from '@payroll-system/shared-types';

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 'yes', 'y'].includes(normalized);
};

// Blank spreadsheet cells arrive as '' rather than undefined, which would
// defeat @IsOptional() (it only skips undefined/null) — normalize first.
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

// Spreadsheet row shape for bulk employee import (P1-T05). Organization fields
// (employeeType/position/department/division) are resolved by NAME, not FK id,
// since HR fills these in by hand — the import service resolves them to ids.
export class ImportEmployeeRowDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @Length(16, 16, { message: 'nik must be exactly 16 digits' })
  nik: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(15, 16, { message: 'npwp must be 15 or 16 digits' })
  npwp?: string;

  // §5.1a — only meaningful (and required) when ptkpManuallyOverridden is true;
  // otherwise the PtkpDerivationService proposes it from maritalStatus/dependentCount.
  @ValidateIf((o: ImportEmployeeRowDto) => o.ptkpManuallyOverridden === true)
  @Transform(emptyToUndefined)
  @IsEnum(PtkpStatus)
  ptkpStatus?: PtkpStatus;

  @IsEnum(MaritalStatus)
  maritalStatus: MaritalStatus;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_DEPENDENT_COUNT)
  dependentCount: number;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  wifeIncomeCombined?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  ptkpManuallyOverridden?: boolean;

  @IsEnum(EmploymentStatus)
  employmentStatus: EmploymentStatus;

  @IsString()
  @MinLength(1)
  employeeType: string;

  @IsString()
  @MinLength(1)
  position: string;

  @IsString()
  @MinLength(1)
  department: string;

  @IsString()
  @MinLength(1)
  division: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  location?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  bankName?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  bankAccountHolderName?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(EmployeeActiveStatus)
  status?: EmployeeActiveStatus;
}
