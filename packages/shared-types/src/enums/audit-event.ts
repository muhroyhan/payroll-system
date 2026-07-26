// Generic append-only audit trail (audit_events) — before/after value history
// for the highest-dispute-risk mutations, layered on top of (not replacing)
// the existing per-table actor columns (*_by / reason, see migrations
// 0003-0006). Phase 1 scope only: PayrollRun, the 7 effective-dated masters,
// and Employee.ptkpManuallyOverridden.
export enum AuditAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
}

// String values match the `entityType` written by each entity's registerAuditLog()
// call (apps/api/src/common/audit) — kept here so the frontend can filter/label
// without guessing the backend's literal strings.
export enum AuditEntityType {
  PAYROLL_RUN = "PayrollRun",
  SALARY_MASTER = "SalaryMaster",
  INCENTIVE_MASTER = "IncentiveMaster",
  PTKP_MASTER = "PtkpMaster",
  TER_BRACKET_MASTER = "TerBracketMaster",
  BPJS_KESEHATAN_MASTER = "BpjsKesehatanMaster",
  BPJS_KETENAGAKERJAAN_MASTER = "BpjsKetenagakerjaanMaster",
  LEAVE_POLICY_MASTER = "LeavePolicyMaster",
  EMPLOYEE = "Employee",
}
