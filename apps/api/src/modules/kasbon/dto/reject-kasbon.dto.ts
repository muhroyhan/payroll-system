import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// Audit-trail follow-up (dispute-traceability review, §1A) — a reason is
// mandatory, not optional, so a rejection always has a recorded "why"
// alongside the "who" (@CurrentUser() in the controller).
export class RejectKasbonDto {
  @IsString()
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  @MinLength(5, { message: 'Alasan penolakan minimal 5 karakter' })
  reason: string;
}
