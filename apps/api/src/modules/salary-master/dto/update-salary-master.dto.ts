import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CreateSalaryMasterDto } from './create-salary-master.dto';

// scopeType/scopeValue stay editable only while the rule hasn't been consumed
// by a payslip (that immutability guard lands in Phase 8); Phase 2 keeps CRUD open.
export class UpdateSalaryMasterDto extends PartialType(CreateSalaryMasterDto) {
  // Audit-trail follow-up (§1C) — required by the service only when this
  // update is a manual retire (effectiveEndDate flips from null to a date);
  // ignored otherwise. See assertRetireReasonProvided.
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Alasan retire minimal 5 karakter' })
  reason?: string;
}
