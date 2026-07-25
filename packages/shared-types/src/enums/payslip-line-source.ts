// §5.8 — payslip_line_items.source: which record generated a line. The six
// documented sources plus `tax`/`bpjs` for the computed PPh21 / employee-BPJS
// deduction lines (§9 Step 7 requires Steps 1,3,4,5 each written as a row).
// tax/bpjs lines have a null source_id (nothing to point back to); the other
// six carry the id of the row that produced them (traceability + the
// PayslipReferenceChecker lock).
export enum PayslipLineSource {
  SALARY_MASTER = "salary_master",
  INCENTIVE_MASTER = "incentive_master",
  TEMP_COMPONENT = "temp_component",
  KASBON = "kasbon",
  SANCTION = "sanction",
  OVERTIME = "overtime",
  TAX = "tax",
  BPJS = "bpjs",
}
