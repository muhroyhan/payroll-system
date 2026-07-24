// §5.8 / §11 — payroll run lifecycle. Forward-only:
// draft → calculated → approved → disbursed.
// `calculated` may revert to `draft` (invalidating its still-draft payslips);
// `approved`/`disbursed` never move backward; `disbursed` is terminal and
// sets locked_at (everything under the run becomes immutable).
export enum PayrollRunStatus {
  DRAFT = "draft",
  CALCULATED = "calculated",
  APPROVED = "approved",
  DISBURSED = "disbursed",
}
