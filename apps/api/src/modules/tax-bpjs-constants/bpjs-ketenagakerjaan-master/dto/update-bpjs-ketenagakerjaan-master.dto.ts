import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CreateBpjsKetenagakerjaanMasterDto } from './create-bpjs-ketenagakerjaan-master.dto';

export class UpdateBpjsKetenagakerjaanMasterDto extends PartialType(
  CreateBpjsKetenagakerjaanMasterDto,
) {
  // Audit-trail follow-up (§1C) — required by the service only when this
  // update is a manual retire (effectiveEndDate flips from null to a date).
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Alasan retire minimal 5 karakter' })
  reason?: string;
}
