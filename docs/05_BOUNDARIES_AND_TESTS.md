# Payroll System — Part E: Boundaries and Test Scenarios

> Part 5 of 5 (final). See [00_README.md](./00_README.md) for the full doc set and how to use it with Claude.
Previous: [04_STEPS.md](./04_STEPS.md)

---

# PART E — BOUNDARIES AND TEST SCENARIOS

## 11. Validation & Immutability Rules (CRUD Restrictions by State)

General principle: **once a piece of source data has been consumed into a generated payslip
— in any run status, since even a "calculated" (not yet approved) payslip gets shown to
admins for review — that source data must not be mutated in place.** Corrections happen by
superseding going forward (a new record, a reversal entry, a reverted run), never by editing
or deleting the historical row. This is what makes a payslip auditable months later instead
of "it depends what the data looked like when we ran it."

Concrete rules per entity:

- **`attendance_records` / `fingerprints`, for a period with a payroll run past `draft`
  status:** locked. To fix an attendance error for that period, an admin must first revert
  the `payroll_run` back to `draft` — and reverting is itself only allowed if the run hasn't
  passed `approved` (an `approved` or `disbursed` run is permanently locked, full stop, no
  revert path). Reverting a `calculated` run should also invalidate/delete its (still-draft)
  `payslips` and `payslip_line_items`, since they'll be regenerated from corrected data.
- **`payslips`:** CRU only, never delete (already noted in §5.8). Once `status = approved`,
  `gross_pay`/`pph21_amount`/BPJS fields/`net_pay` and all linked `payslip_line_items` are
  immutable — the only allowed mutation past `approved` is `pdf_path` (regenerating the PDF
  itself, not the numbers it's built from).
- **`payroll_runs`:** state machine is forward-only (`draft → calculated → approved →
  disbursed`); no skipping stages, no moving backward once `approved`. `disbursed` sets
  `locked_at` and the run (and everything under it) becomes fully immutable — not even a
  revert-and-redo path exists past that point.
- **`kasbon`:** once `approved` and at least one installment has been deducted
  (`remaining_balance < amount`), `amount`/`installment_count`/`installment_amount` become
  immutable. Correcting a kasbon after deductions have started means cancelling future
  installments and opening a new kasbon record — never editing the original retroactively,
  since past payslips already reference it by `source_id`.
- **`leave_balances`:** `quota` stays HR-editable per §5.4 (that's the whole point of
  `manually_adjusted`). But `used` must only ever be mutated by the leave-approval workflow
  reacting to `leave_requests` — never a direct edit, or the balance stops reconciling against
  the request history that's supposed to explain it.
- **`leave_requests`:** once `status = approved` and `start_date` is in the past, the request
  can't be un-approved or deleted — issue an offsetting adjustment (e.g. a negative/corrective
  leave entry) instead, so the approval history stays intact.
- **`surat_peringatan` (sanctions):** once `sanction_amount` has been pulled into a generated
  `payslip_line_item`, that specific letter is locked. A correction is a new SP (or a reversal
  line) in a later period, not an edit to the original — the original payslip already cited it
  as its `source_id`.
- **`overtime_letter`:** once `status = verified` and its hours have fed a payslip's overtime
  line item, immutable. A dispute after the fact needs a new letter for a future period, not a
  retroactive edit of `actual_overtime_hours`.
- **Scope-engine masters (`salary_master`, `incentive_master`, `leave_policy_master`) and
  `payslip_component_master`:** never hard-delete. Retire a rule via `effective_end_date`
  (masters) or by ceasing to reference it (components) instead — past payroll runs must stay
  reproducible using whatever the resolver would have returned *at that run's period*, which
  breaks the moment a row disappears. If a `payslip_component_master` row has ever been
  referenced by an existing `payslip_line_items.component_id`, its `is_taxable`/
  `component_type` become immutable too — changing them would silently make historical
  payslips inconsistent with how they were actually taxed.
- **Tax/BPJS constant tables (§7/§8):** same effective-dating logic as above.

Build this as enforcement at the service layer (not just a UI restriction) — a NestJS guard
or a check at the top of each update/delete service method that looks up whether the record
has been referenced downstream, and throws a domain-specific error (e.g.
`ImmutableRecordError`) if so. Surface that as a clear 409-style API error the frontend can
show as "this record is locked because it's part of a finalized payslip," not a generic
validation failure.

## 12. Test Scenarios & Edge Cases (Run as Phase 10, P10-T01)

Organize automated tests by feature area. Every case here must pass before the project is
considered production-ready.

### 12.1 PTKP & Employee (§5.1, §5.1a)
- **TC-PTKP-01**: Single, 0 dependents → `TK/0`.
- **TC-PTKP-02**: Married, 2 dependents → `K/2`.
- **TC-PTKP-03**: Dependent count of 4 submitted → capped/rejected at 3, never stored as `K/4`.
- **TC-PTKP-04**: Married female, no override, no `wife_income_combined` document → defaults
  to `TK` status, not `K`, even though `marital_status = married`.
- **TC-PTKP-05**: Married female with `ptkp_manually_overridden = true` set to `K/1` → system
  does not silently recompute back to `TK` when `dependent_count` is later edited.
- **TC-PTKP-06**: `wife_income_combined = true` → verify correct downstream TER category.
- **TC-PTKP-07**: NIK/NPWP uniqueness constraint violations rejected cleanly.

### 12.2 Scope Resolver (§5.2)
- **TC-SCOPE-01**: Rule exists only at `employee_type` level → resolves correctly for all
  employees of that type.
- **TC-SCOPE-02**: Rule exists at both `employee_type` and `employee` level for the same
  employee → `employee`-level wins.
- **TC-SCOPE-03**: Rule exists at `division` and `department` for an employee in that
  division/department → `division` wins (more specific).
- **TC-SCOPE-04**: No matching rule at any scope level → resolver returns a clear "unresolved"
  result, not a silent zero/null treated as valid.
- **TC-SCOPE-05**: Rule with `effective_end_date` in the past → excluded from resolution for
  current-period lookups.
- **TC-SCOPE-06**: Two overlapping rules at the *same* scope level with different
  `effective_start_date` ranges → resolver picks the one active for the queried period, not
  just the most recently created.

### 12.3 Attendance & Reconciliation (§5.3)
- **TC-ATT-01**: Two raw scans (in/out) on a normal working day → correct `clock_in`/
  `clock_out`.
- **TC-ATT-02**: Only one raw scan on a day (missed clock-out) → flagged, not silently treated
  as a full day or a zero day.
- **TC-ATT-03**: Scan on a day that's also a holiday → `is_holiday = true`, doesn't count as a
  normal work day discrepancy.
- **TC-ATT-04**: Scan on a day covered by an approved `leave_requests` entry → `is_on_leave =
  true`.
- **TC-ATT-05**: Late arrival with an approved `surat_ijin` → `has_permission = true`, not
  flagged as an unexplained lateness.
- **TC-ATT-06**: Holiday and approved leave overlap on the same date → no double-counting or
  conflicting flags.
- **TC-ATT-07**: CSV-imported attendance row and fingerprint-imported row for the same
  employee/date → clear conflict handling (source precedence or rejection), not silent
  duplication.

### 12.4 Leave (§5.4)
- **TC-LEAVE-01**: New employee at year start → `leave_balances.quota` resolved correctly from
  `leave_policy_master` via the scope resolver.
- **TC-LEAVE-02**: HR manually adjusts one employee's `quota` → `manually_adjusted = true`,
  and the department-wide policy is unaffected for other employees.
- **TC-LEAVE-03**: Approving a `leave_requests` row correctly increments `used` — direct edits
  to `used` are rejected.
- **TC-LEAVE-04**: Request exceeding remaining balance → rejected or flagged, not silently
  approved into negative balance (unless explicitly allowed — confirm behavior before
  building).
- **TC-LEAVE-05**: Attempting to un-approve/delete an approved leave request with a past
  `start_date` → rejected per §11; an offsetting adjustment is the only path.

### 12.5 HR Letters (§5.5)
- **TC-LETTER-01**: `surat_peringatan` with `sanction_component_id` + `sanction_amount` set →
  correctly appears as a deduction line once included in a generated payslip.
- **TC-LETTER-02**: Attempting to edit `sanction_amount` on an SP already referenced by a
  `payslip_line_item` → rejected per §11.
- **TC-LETTER-03**: `overtime_letter` with `actual_overtime_hours` less than
  `planned_overtime_hours` → payslip overtime pay uses `actual_overtime_hours`, not planned.
- **TC-LETTER-04**: Overtime claimed with no corresponding verified `overtime_letter` → not
  paid, per §9 Step 1.
- **TC-LETTER-05**: Editing `actual_overtime_hours` on a `verified` letter already used in a
  payslip → rejected per §11.

### 12.6 Kasbon (§5.6)
- **TC-KASBON-01**: Approved kasbon with `remaining_balance > 0` → correct installment
  deduction generated each run.
- **TC-KASBON-02**: Running the same payroll run's calculation job twice (retry/re-trigger) →
  `remaining_balance` is decremented once, not twice (idempotency).
- **TC-KASBON-03**: `remaining_balance` reaches exactly 0 → `status` transitions to
  `paid_off`, no further deduction lines generated in subsequent runs.
- **TC-KASBON-04**: Attempting to edit `amount`/`installment_count` after at least one
  deduction has occurred → rejected per §11.

### 12.7 Tax Engine — PPh 21 (§7, §9)
- **TC-TAX-01**: Standard TER category A employee, Jan–Nov → correct flat-rate withholding
  matching the worked example from P7-T01.
- **TC-TAX-02**: TER category boundary — an employee whose Taxable Earnings sits exactly at a
  bracket threshold → correct rate applied on the correct side of the boundary (no off-by-one).
- **TC-TAX-02b**: Monthly PPh21 rounding — a `bruto × TER rate` that lands on a fraction is
  rounded to the **nearest Rp 100** (confirmed via WE-07: 9,000,100 × 1.75% = 157,501.75 →
  157,500), not to the nearest rupiah or floored. (The **annual** rounding mode is a separate,
  still-open item — see `04_STEPS.md` P7-T07.)
- **TC-TAX-03**: December (or final month of employment) → full annual Pasal 17 true-up
  computed and correctly offsets amounts already withheld Jan–Nov, producing either a refund
  or an extra deduction as appropriate.
- **TC-TAX-04**: Employee with no NPWP on file → 20% surcharge correctly applied on top of the
  normal rate.
- **TC-TAX-05**: THR/bonus paid in a given month → included in that month's gross income and
  can push the employee into a higher TER bracket for that month only, reverting the next
  month.
- **TC-TAX-06**: Employee with `wife_income_combined` → correct TER category applied (cross-
  check against TC-PTKP-06).
- **TC-TAX-07**: Mid-year hire or termination → partial-year Pasal 17 true-up handles a
  non-12-month employment period correctly (don't assume a full year of prior withholding).

### 12.8 BPJS (§8, §9)
- **TC-BPJS-01**: BPJS-Eligible Earnings below the Kesehatan cap → 1%/4% split on actual
  earnings.
- **TC-BPJS-02**: BPJS-Eligible Earnings above the Kesehatan cap → capped base used, not raw
  earnings.
- **TC-BPJS-03**: JHT has no cap — verify base is never artificially capped even for very high
  earners.
- **TC-BPJS-04**: JP wage cap boundary — earnings exactly at, just above, and just below the
  cap all produce correct results.
- **TC-BPJS-05**: JKK/JKM are 100% company-borne — verify employee's `net_pay` is never
  reduced by these.

### 12.9 Payroll Run & Payslip (§5.8, §9, §11)
- **TC-PAYROLL-01**: Full calculation for a run of several hundred employees completes via the
  background job without timing out an HTTP request.
- **TC-PAYROLL-02**: A chunk fails mid-run (simulated) → only that chunk needs retry, not the
  whole run.
- **TC-PAYROLL-03**: Every `payslip_line_items` row correctly traces back to its `source` +
  `source_id` (salary, incentive, temp component, kasbon, sanction, overtime).
- **TC-PAYROLL-04**: Attempting to edit `attendance_records` for a period whose run is
  `calculated` or later → rejected, per §11, unless the run is first reverted to `draft`.
- **TC-PAYROLL-05**: Attempting to revert a run that is `approved` or `disbursed` → rejected,
  no exceptions.
- **TC-PAYROLL-06**: Attempting to delete a `payslips` row in any status → rejected; there is
  no delete path, ever.
- **TC-PAYROLL-07**: Attempting to edit `gross_pay`/`net_pay`/any BPJS or PPh21 field on an
  `approved` payslip → rejected; only `pdf_path` may change.
- **TC-PAYROLL-08**: Two employees with identical `employee_type`/position/department/division
  but different `employee`-level overrides → each gets the correct resolved value in the same
  run (verifies P8-T03's per-combination caching didn't collapse distinct employee overrides).

### 12.10 Closing Sign-Off Checklist (P10-T04)

Before marking the project ready to use, confirm all of the following:

- [ ] Every test case in §12.1–12.9 passes.
- [ ] Every tax/BPJS constant has been verified against `pajak.go.id` /
      `bpjsketenagakerjaan.go.id` within the last build cycle.
- [ ] A full end-to-end payroll cycle (P10-T02) has been run manually at least once, start to
      finish, on realistic (non-trivial) sample data.
- [ ] Every rule in §11 has an actual enforced guard, not just a documented intention —
      attempt each locked mutation in §11 directly and confirm it's rejected.
- [ ] No hardcoded tax/BPJS numbers exist anywhere in the calculation service code — grep for
      literal PTKP amounts, TER percentages, or BPJS caps to confirm.

---

*Last updated: reflects PP 58/2023 (TER), Perpres 64/2020 (BPJS Kesehatan), and BPJS
Ketenagakerjaan structure as of mid-2026. Re-verify rates before each tax year if this
project is still evolving.*
