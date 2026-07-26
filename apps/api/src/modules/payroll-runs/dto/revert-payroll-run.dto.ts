import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// Audit-trail follow-up (dispute-traceability review, §1B) — reverting a
// calculated run tears down every payslip/kasbon deduction it produced
// (PayrollRunRevertService); a reason is mandatory, not optional, so that
// destructive action always has a recorded "why" alongside the "who"
// (@CurrentUser() in the controller) and "when" (updatedAt).
export class RevertPayrollRunDto {
  @IsString()
  @IsNotEmpty({ message: 'Alasan revert wajib diisi' })
  @MinLength(5, { message: 'Alasan revert minimal 5 karakter' })
  reason: string;
}
