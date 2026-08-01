import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  EmployeeActiveStatus,
  EmploymentStatus,
  Gender,
  MaritalStatus,
  MAX_DEPENDENT_COUNT,
  PtkpStatus,
} from '@payroll-system/shared-types';

export class CreateEmployeeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @Length(16, 16, { message: 'nik must be exactly 16 digits' })
  nik: string;

  // EMP-012 — NPWP is genuinely optional; a cleared field arrives as `''`,
  // not `undefined`, and @IsOptional() only skips validation for
  // null/undefined, so without this it still ran @Length(15, 16) against an
  // empty string and rejected clearing the field. Normalize '' to null
  // (npwp is nullable, not just optional) before validation runs.
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @Length(15, 16, { message: 'npwp must be 15 or 16 digits' })
  npwp?: string | null;

  // §5.1a — only meaningful (and required) when ptkpManuallyOverridden is true;
  // otherwise the PtkpDerivationService proposes it from maritalStatus/dependentCount.
  @ValidateIf((o: CreateEmployeeDto) => o.ptkpManuallyOverridden === true)
  @IsEnum(PtkpStatus)
  ptkpStatus?: PtkpStatus;

  @IsEnum(MaritalStatus)
  maritalStatus: MaritalStatus;

  // §5.1a — required for correct PTKP derivation (married-female exception).
  @IsEnum(Gender)
  gender: Gender;

  @IsInt()
  @Min(0)
  @Max(MAX_DEPENDENT_COUNT)
  dependentCount: number;

  @IsOptional()
  @IsBoolean()
  wifeIncomeCombined?: boolean;

  // §5.1a — Surat Keterangan (husband has no income). Flips a married female's
  // derived PTKP from TK to K.
  @IsOptional()
  @IsBoolean()
  spouseNoIncomeCertificate?: boolean;

  @IsOptional()
  @IsBoolean()
  ptkpManuallyOverridden?: boolean;

  // §D audit-trail follow-up — required by EmployeesService (not enforced
  // here at the DTO level, since it's only mandatory at the false -> true
  // transition, which the DTO alone can't see — the service compares against
  // the existing record). Optional here so an update that leaves an
  // already-active override untouched doesn't need to resend it.
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Alasan timpa manual PTKP minimal 3 karakter' })
  ptkpOverrideReason?: string;

  @IsEnum(EmploymentStatus)
  employmentStatus: EmploymentStatus;

  @IsUUID()
  employeeTypeId: string;

  @IsUUID()
  positionId: string;

  @IsUUID()
  departmentId: string;

  @IsUUID()
  divisionId: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankAccountHolderName?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(EmployeeActiveStatus)
  status?: EmployeeActiveStatus;
}
