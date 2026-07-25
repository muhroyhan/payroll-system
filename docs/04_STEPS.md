# Payroll System — Part D: Steps

> Part 4 of 5. See [00_README.md](./00_README.md) for the full doc set and how to use it with Claude.
Previous: [03_STRUCTURE.md](./03_STRUCTURE.md) · Next: [05_BOUNDARIES_AND_TESTS.md](./05_BOUNDARIES_AND_TESTS.md)

---

# PART D — STEPS

## 10. Feature Roadmap (Phases With Task IDs)

Build order is driven by dependency, not excitement. Each task has an ID (`P{phase}-T{seq}`)
so progress and future prompts can reference a specific task ("we finished P3-T03, start
P3-T04"). Some of the least visually interesting phases (constants, the scope engine) unblock
almost everything after them — resist jumping straight to payslip generation.

### Phase 1 — Foundation & Constants
*Depends on: nothing (start here)*

| Task ID | Task | Details |
|---|---|---|
| P1-T01 | Monorepo scaffolding | pnpm workspace, `apps/api` (NestJS), `apps/web` (React+Vite), `packages/shared-types` per §6 |
| P1-T02 | Database + migrations setup | Sequelize + MySQL connection, migration tooling, no direct schema edits ever |
| P1-T03 | Auth module | JWT login, roles (admin / HR staff), guards |
| P1-T04 | Employee entity + CRUD | Full `employees` shape per §5.1, including PTKP raw inputs + computed column |
| P1-T05 | Employee Excel/CSV import | Bulk-create employees from a spreadsheet |
| P1-T06 | PTKP derivation service | Implements §5.1a: raw inputs → proposed `ptkp_status`, respects `ptkp_manually_overridden` |
| P1-T07 | `payslip_component_master` CRUD | Names + `component_type` + `is_taxable` |
| P1-T08 | Tax/BPJS constant masters CRUD | PTKP master, TER bracket master, BPJS rate/cap master — **effective-dated** per §7 |
| P1-T09 | Salary period config | Monthly cycle config |
| P1-T10 | Seed constants | Verify every seeded number against `pajak.go.id` / `bpjsketenagakerjaan.go.id` before committing seed data |

### Phase 2 — Scope Resolution Engine + Masters
*Depends on: Phase 1 (employee_type/position/department/division must exist)*

| Task ID | Task | Details |
|---|---|---|
| P2-T01 | Shared `ScopeResolverService` | Single implementation, priority `employee > division > department > position > employee_type`, per §5.2 |
| P2-T02 | `salary_master` CRUD + resolver wiring | |
| P2-T03 | `incentive_master` CRUD + resolver wiring | |
| P2-T04 | `leave_types` + `leave_policy_master` CRUD + resolver wiring | |
| P2-T05 | Resolver unit tests | Priority overrides, missing-rule fallback, expired rule (`effective_end_date` in the past) — see §12 for full cases |
| P2-T06 | Holidays master | Seed from Google Calendar Indonesian feed, allow manual add/edit/remove |

### Phase 3 — Attendance & Fingerprint
*Depends on: Phase 2 (holidays, leave policy master)*

| Task ID | Task | Details |
|---|---|---|
| P3-T01 | `fingerprints` CRUD | |
| P3-T02 | `attendance_raw_logs` ingestion | File or API pull from device export |
| P3-T03 | Reconciliation service | Raw logs → `attendance_records`, resolving holiday/leave/permission; build and test independently of the payslip engine |
| P3-T04 | `leave_balances` | Resolved from Phase 2 policy master at year start, then per-employee editable |
| P3-T05 | `leave_requests` CRUD + approval workflow | |
| P3-T06 | Reconciliation unit tests | See §12 for edge cases (missed scan, holiday+leave overlap, etc.) |

### Phase 4 — HR Letters
*Depends on: Phase 3 (attendance_records), Phase 1 (payslip_component_master)*

| Task ID | Task | Details |
|---|---|---|
| P4-T01 | `surat_ijin` CRUD + PDF | |
| P4-T02 | `surat_peringatan` (SP + sanction) CRUD + PDF | Links `sanction_component_id` |
| P4-T03 | `overtime_letter` CRUD + PDF | `verified` status workflow, cross-checked against `attendance_records` |
| P4-T04 | Wire approved `surat_ijin` back into reconciliation | Sets `has_permission` on affected `attendance_records`. Reconciliation (§5.3) already depends on a `PermissionResolver` interface with a `NoPermissionResolver` stub (always `false`) — this task provides the real surat_ijin-backed implementation and swaps the DI binding; it is not a refactor of the reconciliation service itself |

### Phase 5 — Kasbon
*Depends on: Phase 1 (employees)*

| Task ID | Task | Details |
|---|---|---|
| P5-T01 | `kasbon` CRUD + approval workflow | |
| P5-T02 | Idempotent installment deduction logic | Decrement `remaining_balance` safely against repeat runs (§5.6) |
| P5-T03 | Immutability guard | Lock `amount`/`installment_count`/`installment_amount` once `remaining_balance < amount` (§11) |

### Phase 6 — Komponen Payslip Sementara
*Depends on: Phase 2 (scope resolver)*

| Task ID | Task | Details |
|---|---|---|
| P6-T01 | `payslip_temp_components` CRUD | Scoped via resolver, period-bound (`period_year`/`period_month`) |

### Phase 7 — Tax & BPJS Engine
*Depends on: Phase 1 (constants), Phase 2 (resolver)*

| Task ID | Task | Details |
|---|---|---|
| P7-T01 | Collect worked examples | Hand-verified (or official-calculator-verified) examples supplied by Royhan **before** any calc code is written. **Must include at least one married-female, no-certificate case** — the derivation service (§5.1a) currently resolves this to `TK/0` regardless of `dependent_count`; confirm that's correct (vs. `TK/{dependent_count}`) against an official example before P7-T02 relies on it |
| P7-T02 | TER bracket lookup service | Category A/B/C via `ptkp_status` |
| P7-T03 | PPh21 Gross-method — Jan–Nov TER path | |
| P7-T04 | PPh21 December/final-month Pasal 17 true-up | |
| P7-T05 | BPJS Kesehatan calculator | Cap + 1%/4% split |
| P7-T06 | BPJS Ketenagakerjaan calculator | JHT, JP (capped), JKK, JKM |
| P7-T07 | Tests against every P7-T01 worked example | Must pass before Phase 8 starts — this is the hard gate. **RESOLVED:** WE-01/02/03/06 reconciled to the official DJP calculator; **monthly** PPh21 rounding confirmed as round-to-nearest-100 via WE-07 (was `Math.round` per-rupiah — now `roundToNearestHundred`). **STILL OPEN:** the **annual** (December true-up) rounding mode is unverified — WE-05 lands on an exact multiple of 100 so proves nothing; `calculateAnnualPph21Trueup` still uses plain `Math.round` and must NOT be aligned to round-100 without a *fractional* December worked example |
| P7-T08 | NPWP-missing 20% surcharge flag | Signature already wired: `npwpMissing` flag on `calculateMonthlyPph21` (P7-T03) and `calculateAnnualPph21Trueup` (P7-T04), defaulting false — P7-T08 only flips it from employee data |

**Phase 7 status: all tasks CLOSED except one open item (below).**

> ### ⛔ PRE-PRODUCTION CHECKLIST — must close before the FIRST December payroll run in production
>
> - [ ] **Annual PPh21 rounding mode is UNVERIFIED.** The monthly path is confirmed
>   round-to-nearest-100 (WE-07), but `calculateAnnualPph21Trueup` (P7-T04) still uses plain
>   `Math.round` because WE-05 lands on an exact multiple of 100 and proves nothing. This does
>   **not** block Phase 8 development (the Jan–Nov monthly path is fully verified), but it is a
>   **hard gate before any real December / final-month true-up is run in production** — a wrong
>   rounding mode there silently mis-states every year-end payslip. **To close:** obtain a
>   December worked example whose annual PPh21 lands on a *fraction* from the official DJP
>   calculator, then confirm round-100 vs nearest-rupiah vs truncate and update the annual core
>   + add the fixture. See `03_STRUCTURE.md` §7 (R7 note) and `payroll-calculation/
>   pph21-annual-trueup.core.ts` (the flagged `Math.round`).

### Phase 8 — Payroll Run & Payslip Generation
*Depends on: Phase 7, Phase 5, Phase 6, Phase 4*

| Task ID | Task | Details |
|---|---|---|
| P8-T01 | `payroll_runs` state machine | `draft → calculated → approved → disbursed`, forward-only, guarded (§11) |
| P8-T02 | BullMQ "Calculate Payroll Run" job | Chunked (100–200/batch), `processed_count`/`total_count` progress |
| P8-T03 | Per-run resolver caching | Pre-resolve scope values once per unique combination, not per employee (§2.2) |
| P8-T04 | Full §9 calculation implementation | `bulkCreate` for `payslips` + `payslip_line_items`. **Consideration (from P8-T02):** a job retry after a mid-run crash currently re-chunks from chunk 1 — idempotent (absolute-set progress + per-employee unique constraint) but wasteful. When the real calculation replaces the placeholder, evaluate **resume-from-offset** (skip employees whose payslip for this run already exists) so a retry doesn't reprocess hundreds of already-correct employees |
| P8-T05 | PDF generation queue | **Reuses the existing `pdf-generation` queue/processor (P4-T01/T02/T03)** — "separate from the calculation job" (this row) is satisfied by that queue already being distinct from `payroll-calculation`; a payslip PDF is one small per-document job, the same shape as a letter PDF, so it gets a `generate-payslip-pdf` case on the existing `PdfGenerationProcessor` rather than a third queue. Bulk-enqueued for every payslip in a run right after the calculation job flips it to `calculated`. Guard: once a payslip already has a `pdf_path` and its run is `approved`/`disbursed`, the job is a no-op — the issued PDF must not be silently re-rendered with newer employee master data even though §11 otherwise allows `pdf_path` to be the one mutable field past `approved` |
| P8-T06 | Payroll summary report | |
| P8-T07 | Immutability guards | Closing audit of every §11 lock at Phase 8's final wired state. **Findings closed:** (a) **attendance lock (TC-PAYROLL-04)** was unenforced — added `PayrollPeriodLockService` (a period is locked once its run is past `draft`) and guard it at the top of `AttendanceRecordsService.upsert` (covers manual/csv/reconcile, all funnel through it); (b) **revert-to-draft teardown** (gap flagged in P8-T01) — reverting now deletes the run's payslips + line items and rolls back the kasbon installments they drew, in one transaction. **Verified already-correct:** surat_peringatan/overtime_letter locks (real `PayslipReferenceChecker`, both update+delete), kasbon field lock (`assertLockedFieldsUntouched`), payslips (no mutation endpoint exists — locked by construction; only PDF path mutates, guarded in P8-T05). **Revert-rollback decision:** kasbon deductions ARE reversed (they mutated real state); sanction/overtime letters are NOT explicitly touched — their lock is derived from the line-item reference, so deleting the line items auto-releases them |

### Phase 9 — Nice-to-haves / Premium Features
*Depends on: Phase 8 fully signed off*

**STATUS: DEFERRED — not implemented (decision recorded at Phase 10 kickoff).** All three are
genuine nice-to-haves with **no dependency from Phase 10 or from initial production**: the core
payroll system (Phases 1–8) is complete and go-live-ready without any of them. Each can be
built independently later without refactoring Phases 1–8 — they add new paths, not changes to
existing ones (gross-up is an alternative tax mode alongside the existing gross method;
multi-location is an extra scope dimension the resolver already generalizes to; fingerprint
polling is an alternative ingestion source feeding the same `attendance_raw_logs`). Not a gap
in the delivered scope; a deliberate deferral.

| Task ID | Task | Details |
|---|---|---|
| P9-T01 | Gross-up tax method | **DEFERRED** — alternative to the delivered gross method; additive, no refactor of P7 |
| P9-T02 | Multi-location rule differences | **DEFERRED** — extra scope dimension; the §5.2 resolver already generalizes |
| P9-T03 | Direct fingerprint device API polling | **DEFERRED** — alternative ingestion into the same `attendance_raw_logs`; independent of P3 reconciliation |

### Phase 10 — Testing, Validation & Go-Live Verification
*Depends on: all prior phases. This phase exists so the AI has an explicit final gate — do
not consider the project production-ready until every item here passes.*

| Task ID | Task | Details |
|---|---|---|
| P10-T01 | Run the full test suite | Every test case in §12, including edge cases — no skips |
| P10-T02 | End-to-end smoke test | One full payroll cycle: attendance → letters → kasbon → temp components → calculation → approval → disbursement → PDF |
| P10-T03 | Final constants check | Re-verify every tax/BPJS constant against official sources one last time before go-live |
| P10-T04 | Sign-off checklist | Confirm the closing checklist at the end of §12 is fully checked |

---

### Backlog — Non-Urgent (not pre-production blockers)

These are known, tracked gaps that do **not** block go-live and are **not** on the
pre-production checklist. Distinct from the ⛔ pre-production item above (annual PPh21 rounding),
which IS a hard gate before the first December run.

- [ ] **ESLint does not cover `.js` files in `src/database/` (migrations + seeders).**
  `apps/api/tsconfig.json` has no `allowJs`, so the 46 `.js` files under `src/database/`
  (migrations, seeders, `sequelize-cli.config.js`) fall outside the TypeScript project service
  and fail to parse under `eslint src` with `Parsing error: ... was not found by the project
  service` (one per file → 46 "errors"). **This is a lint-config coverage gap, not a functional
  bug** — the migrations/seeders run correctly; they're simply not linted. The gap has existed
  since Phase 1 (neither `tsconfig.json` nor `eslint.config.mjs` has changed since the initial
  commit); it surfaced during the P8-T07 audit only because that was the first time `eslint`
  was run unscoped (`eslint src`) rather than scoped to a touched `src/modules/*` directory.
  **To close (whenever convenient):** either add a dedicated flat-config block for `**/*.js`
  using a non-type-checked parser (e.g. `languageOptions.parserOptions.projectService: false`
  for that glob), or add the `.js` files to an `allowJs` tsconfig include, or explicitly
  `ignores` `src/database/**/*.js` if linting generated migrations is not wanted. Verify with
  `find apps/api/src -name "*.js" | wc -l` (= 46) matching the parse-error count.

