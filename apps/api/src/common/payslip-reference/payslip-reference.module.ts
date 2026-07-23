import { Module } from '@nestjs/common';
import {
  NoPayslipReferenceChecker,
  PAYSLIP_REFERENCE_CHECKER,
} from './payslip-reference-checker.interface';

// Shared by every letter type that can be pulled into a payslip_line_item
// (surat_peringatan, overtime_letter). Phase 8 replaces the stub binding
// here with a real payslip_line_items-backed checker — one swap point for
// both consumers, not one per module.
@Module({
  providers: [
    { provide: PAYSLIP_REFERENCE_CHECKER, useClass: NoPayslipReferenceChecker },
  ],
  exports: [PAYSLIP_REFERENCE_CHECKER],
})
export class PayslipReferenceModule {}
