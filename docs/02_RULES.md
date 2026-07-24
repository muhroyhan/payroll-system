# Payroll System — Part B: Rules

> Part 2 of 5. See [00_README.md](./00_README.md) for the full doc set and how to use it with Claude.
Previous: [01_GENERAL.md](./01_GENERAL.md) · Next: [03_STRUCTURE.md](./03_STRUCTURE.md)

---

# PART B — RULES

## 3. Rules for AI: Boundaries When Developing With This Doc

These are hard boundaries, not suggestions — if a request in a session conflicts with one of
these, flag the conflict instead of silently complying.

**Process rules:**
- Always read this full doc (or at minimum §5–§9 and this section) before writing code for a
  new phase, and confirm which Phase/Task ID is being worked on before starting.
- Follow the Phase order in §10 — don't jump ahead to a later phase's tables/logic because
  it seems more interesting; earlier phases (constants, scope engine) unblock everything
  after them.
- For Phase 7 (tax/BPJS): do not write calculation logic before hand-verified worked examples
  exist and tests are written against them. This is the one phase where "I'll verify later"
  is not acceptable — a wrong bracket lookup silently produces wrong payslips.
- When a PPh21 bracket, PTKP amount, or BPJS rate/cap is needed, verify it against
  `pajak.go.id` / `bpjsketenagakerjaan.go.id` before using it — don't trust a remembered or
  aggregator-sourced figure, since sources disagree.
- If a business rule in this doc is ambiguous or a real-world case isn't covered, stop and
  ask rather than guessing — especially anywhere tax, BPJS, or money changes hands.

**Architecture rules:**
- Never build a second/parallel scope-resolution implementation for Salary, Incentive, Leave,
  or Temp Components — there is exactly one shared resolver service (§5.2); everything else
  calls into it.
- Never run payroll calculation, bulk recalculation, or PDF generation synchronously inside
  an HTTP request handler — these are BullMQ jobs (§2.2), no exceptions.
- Never hardcode PTKP amounts, TER brackets, or BPJS rates/caps in business logic — they live
  in admin-editable, effective-dated tables (§7/§8) and are looked up per period.
- Never add multi-tenant fields (`tenant_id` etc.) anywhere in the schema — this is
  single-tenant per §4.
- Never implement a feature listed as out-of-scope in §4 without an explicit updated
  instruction that supersedes this doc.

**Data integrity rules:**
- Never add a hard-delete endpoint for `payslips`, `payroll_runs` (once past `draft`),
  `salary_master`/`incentive_master`/`leave_policy_master` rows, or anything referenced by an
  existing `payslip_line_items` row — see §11 for the full immutability list. Retiring a rule
  means `effective_end_date`, not deletion.
- Never let a direct edit to `leave_balances.used` bypass the leave-approval workflow.
- Always write schema changes as migrations — never hand-edit a production schema.
- Always make the "deduct kasbon installment" step idempotent per payroll run (§9-adjacent,
  see §5.6) — this is the one place a repeat-run bug directly costs someone money.

## 4. Scope & Assumptions (What This Project Explicitly Does NOT Cover)

Stating these boundaries up front avoids scope creep and gives Claude a clear "no" list.

- **Working hours:** assumes a standard Monday–Friday, 08:00–17:00 schedule with a 12:00–
  13:00 lunch break, for all employee types. No support for shift work, rotating schedules,
  split shifts, or 6-day work weeks.
- **Single company, single currency (IDR), single tax jurisdiction (Indonesia).** No
  multi-currency, no expatriate/foreign tax treaty handling.
- **Single-tenant only.** No multi-tenant SaaS layer (per the earlier tenancy decision) — one
  deployment serves one company.
- **Monthly payroll cycle only.** No biweekly or weekly payroll support.
- **Fingerprint integration is import-only.** The project ingests exported logs (file or API
  pull) from a device that already has its own export mechanism — building device driver or
  firmware-level integration is out of scope.
- **No direct bank disbursement API.** Payment is assumed to happen manually or via a
  bank-provided transfer file export, not an automated push-to-bank integration.
- **No employee self-service portal (in this scope).** Leave requests, kasbon requests, and
  letters are entered/approved by HR/admin staff, not submitted directly by employees. A
  self-service portal is a reasonable future phase, not part of this build.
- **Not a full HRIS.** No recruitment, performance review, or training/certification
  tracking — this is a payroll + related HR-letters system specifically.
- **Primarily salaried monthly ("tetap") employees.** "Tidak tetap"/daily-wage workers get
  just enough support for the TER Harian tax category (§7) — this isn't a full contractor/
  freelancer payroll system.

---

