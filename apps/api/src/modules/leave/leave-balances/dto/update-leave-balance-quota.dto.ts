import { IsInt, IsNotEmpty, IsString, Min, MinLength } from 'class-validator';

// Only quota is editable through this route — `used` only ever moves via the
// leave_requests approval workflow (§11), never a direct edit. Audit-trail
// follow-up (§1C) — a reason is mandatory, not optional, so a manual quota
// adjustment always has a recorded "why" alongside the "who"
// (@CurrentUser() in the controller).
export class UpdateLeaveBalanceQuotaDto {
  @IsInt()
  @Min(0)
  quota: number;

  @IsString()
  @IsNotEmpty({ message: 'Alasan penyesuaian kuota wajib diisi' })
  @MinLength(5, { message: 'Alasan penyesuaian kuota minimal 5 karakter' })
  reason: string;
}
