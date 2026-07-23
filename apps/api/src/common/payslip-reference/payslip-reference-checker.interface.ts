import { Injectable } from '@nestjs/common';

// §5.2/§11 — payslip_line_items has a generic `source` + `source_id` pair
// (salary_master/incentive_master/temp_component/kasbon/sanction/overtime).
// Any letter type whose amount/hours can be pulled into a line item shares
// the exact same lock question: "has this source_id been cited by a payslip
// yet?" — so surat_peringatan (source='sanction') and overtime_letter
// (source='overtime') share ONE checker interface instead of one each.
// payslip_line_items doesn't exist until Phase 8, and wiring the real check
// is that phase's own task — this module depends on the interface, not on
// payslip_line_items directly (same DI-swap pattern as PermissionResolver,
// P3-T03/P4-T04). Phase 8 only provides a real implementation and swaps the
// binding; no refactor of the services that guard against it.
export type PayslipReferenceSource = 'sanction' | 'overtime';

export interface PayslipReferenceChecker {
  isReferencedByPayslip(
    source: PayslipReferenceSource,
    sourceId: string,
  ): Promise<boolean>;
}

export const PAYSLIP_REFERENCE_CHECKER = Symbol('PAYSLIP_REFERENCE_CHECKER');

@Injectable()
export class NoPayslipReferenceChecker implements PayslipReferenceChecker {
  isReferencedByPayslip(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
