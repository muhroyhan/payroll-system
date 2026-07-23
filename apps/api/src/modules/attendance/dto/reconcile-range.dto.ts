import { IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ReconcileRangeDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  // TC-ATT-07 — force-replace a differently-sourced row on any date in range.
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}
