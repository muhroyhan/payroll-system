import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

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

  // Audit-trail follow-up (§D) — one reason for the whole range, attached to
  // every audit_events row this reconciliation writes.
  @IsOptional()
  @IsString()
  reason?: string;
}
