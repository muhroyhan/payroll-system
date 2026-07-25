# Payroll System — Part C: Structure

> Part 3 of 5. See [00_README.md](./00_README.md) for the full doc set and how to use it with Claude.
Previous: [02_RULES.md](./02_RULES.md) · Next: [04_STEPS.md](./04_STEPS.md)

---

# PART C — STRUCTURE

## 5. Core Data Model

Keep this as your starting ERD. Expand as needed, but don't add multi-tenant fields
(`tenant_id` etc.) — single-tenant per §4.

### 5.1 Core

```
employees
├─ id
├─ name
├─ nik (national ID)
├─ npwp (tax ID, nullable — affects PPh21 rate, see §7)
├─ ptkp_status (enum: TK/0, TK/1, TK/2, TK/3, K/0, K/1, K/2, K/3 — computed + override,
│               see §5.1a and §7)
├─ marital_status (single / married — raw input, feeds ptkp_status)
├─ gender (male / female — raw input, feeds ptkp_status; needed for the married-female
│               exception below, see §5.1a) [added Phase 2 audit — not in the original ERD]
├─ dependent_count (0–3, capped per DJP rules — raw input, feeds ptkp_status)
├─ wife_income_combined (bool, only relevant if married — raw input, feeds ptkp_status;
│               see §5.1a)
├─ spouse_no_income_certificate (bool — Surat Keterangan proving the husband has no income;
│               only meaningful when gender = female and married; flips the married-female
│               default from TK to K, see §5.1a) [added Phase 2 audit]
├─ ptkp_manually_overridden (bool — true if HR set ptkp_status directly; see §5.1a)
├─ employment_status (tetap / tidak tetap — affects TER calculation method)
├─ employee_type, position, department, division (all FKs — used by the scope engine, §5.2)
├─ location (office 1 / office 2, if you support multi-location)
├─ bank_account_details
├─ start_date, end_date (nullable)
└─ status (active / inactive)
```

`base_salary` is not a column on `employees` — it's resolved from `salary_master` (§5.2), so
an employee only stores an override if they're a special case.

### 5.1a PTKP Status: Derive It, But Store the Result (Not Just the Inputs)

Decision: **store both** — the raw inputs (`marital_status`, `dependent_count`,
`wife_income_combined`) **and** the resolved `ptkp_status` enum as a real column, computed by
a small service function whenever the inputs change. Don't store only the raw inputs and
recompute `ptkp_status` on the fly everywhere it's needed, and don't store only the enum and
throw away the inputs.

**Why not derive-only (the old-project approach):** the raw combination-to-status mapping
isn't a clean formula — it has real exceptions DJP recognizes:
- Standard case: `TK` if single, `K` if married, followed by `dependent_count` (capped at 3).
- **Exception:** a married *female* employee normally still gets `TK` status by default
  (dependents are assumed claimed on the husband's PTKP), **unless** she can provide a
  `Surat Keterangan` proving her husband has no income/isn't employed — only then does she
  get `K` status. This is a document-backed exception, not something derivable from
  gender/marital/dependent-count fields alone.
- **`wife_income_combined`** (NPWP digabung) is a separate, rarer case affecting how combined
  household income is taxed — also not inferable purely from demographic fields.

Because of these exceptions, a pure "detect it from gender + kids + marital status" function
will occasionally compute a status that's wrong for a specific employee's actual paperwork.
That's why `ptkp_manually_overridden` exists: HR enters the raw inputs, the system proposes a
`ptkp_status`, and HR can override it if the employee's supporting documents say otherwise —
the override flag just means "don't silently recompute over this if the raw inputs change
later without HR re-checking it."

**Implemented (Phase 2 audit):** the married-female exception above is now modeled directly —
`gender` and `spouse_no_income_certificate` were added to `employees` (not in the original ERD)
specifically so the derivation service can apply it instead of leaving every married-female
case to manual override. The derivation rules as built:
- Single → `TK/{dependent_count}`.
- Married male → `K/{dependent_count}`.
- Married female, no certificate → **`TK/0`** — not `TK/{dependent_count}`. Her dependents are
  assumed claimed on the husband's PTKP, so they don't add to *her* count either; the
  derivation collapses straight to the base TK figure.
- Married female, with certificate (husband has no income) → `K/{dependent_count}`, same as a
  married male.

✅ **R6 RESOLVED (P7-T01).** The `TK/0` default for the married-female / no-certificate case
was confirmed against the official DJP calculator (pajak.go.id) via worked example **WE-04
version (a)**: her own dependents are claimed on the husband's PTKP, so her withholding uses
the base `TK/0` figure, **not** `TK/{dependent_count}`. The four derivation rules above are
final and the tax engine (§7) may rely on them.

**Practical effect:** the derivation service saves the "must maintain every combination by
hand" pain from the old project, while the stored `ptkp_status` column means payroll
calculation (§9) never has to re-run derivation logic per employee per run — it just reads
the column, exactly like `base_salary` reads a resolved value instead of recomputing it live.

### 5.2 Scope Resolution Engine (shared by Salary, Incentive, Leave, and Temp Components)

Master Gaji Karyawan, Master Insentif, Master Cuti, and Komponen Payslip Sementara all need
the same thing: "this value applies to X, unless a more specific rule overrides it." Build
**one** reusable mechanism instead of four separate ones:

```
policy_scope (embedded as columns on each table below, not a separate table)
├─ scope_type (enum: employee_type / position / department / division / employee)
└─ scope_value (the FK id matching scope_type)
```

**Resolution priority (most specific wins):** `employee` > `division` > `department` >
`position` > `employee_type`. When resolving a value for an employee, look up all matching
rows across scope levels and take the most specific one. Write this resolver as a single
shared service — everything below calls into it.

```
salary_master              (Master Gaji Karyawan)
├─ id
├─ scope_type, scope_value
├─ base_salary
├─ effective_start_date, effective_end_date (nullable = still active)
└─ created_by

incentive_master           (Master Insentif — same shape as salary_master)
├─ id
├─ scope_type, scope_value
├─ incentive_amount
├─ effective_start_date, effective_end_date
└─ created_by

payslip_component_master   (constants: names of earning/deduction line items)
├─ id
├─ name (e.g. "Tunjangan Transport", "Potongan Kasbon", "Sanksi SP2")
├─ component_type (earning / deduction)
└─ is_taxable (affects whether it counts toward PPh21/BPJS base — see §9)

payslip_temp_components    (Komponen Payslip Sementara — one-off/period-specific amounts)
├─ id
├─ component_id (FK → payslip_component_master)
├─ scope_type, scope_value
├─ amount
├─ period_year, period_month (only applies to this specific month)
└─ created_by
```

### 5.3 Attendance & Fingerprint

```
fingerprints
├─ id
├─ employee_id
├─ device_user_id (the ID the fingerprint device uses internally)
├─ device_id
└─ enrolled_at

attendance_raw_logs        (raw scans pulled from fingerprint device/software)
├─ id
├─ device_user_id, device_id
├─ scan_time
└─ scan_type (in / out, if the device reports it — many don't; you may need to infer
              in/out from scan order per day instead)

attendance_records         (derived/reconciled — what payroll actually uses)
├─ id
├─ employee_id, date
├─ clock_in, clock_out, overtime_hours
├─ is_holiday (resolved against holidays master)
├─ is_on_leave (resolved against leave_requests)
├─ has_permission (resolved against surat_ijin, if late/early was pre-approved)
└─ source (fingerprint / manual / csv_import)
```

**Reconciliation matters more than raw import.** Turning two raw in/out scans per day into a
correct `attendance_records` row that already accounts for holidays, approved leave, and
approved permission letters is the actual engineering problem here — build it as its own
service, testable independently of the payslip engine.

### 5.4 Leave (Rekap Cuti — standardized like Salary/Incentive, with per-employee flexibility)

```
leave_types
├─ id
└─ name  (cuti tahunan, sakit, izin khusus, etc.)

leave_policy_master        (standardized quota — uses the same scope engine as §5.2)
├─ id
├─ leave_type_id (FK → leave_types)
├─ scope_type, scope_value
├─ annual_quota
├─ effective_start_date, effective_end_date
└─ created_by

leave_balances              (the actual per-employee record — this is where flexibility lives)
├─ employee_id, leave_type_id, year
├─ quota            (initially resolved from leave_policy_master via the scope resolver,
│                     but stored per-employee so HR can edit it directly afterward)
├─ used
└─ manually_adjusted (flags that HR overrode the resolved default for this specific employee)

leave_requests
├─ id
├─ employee_id, leave_type_id
├─ start_date, end_date
├─ status (pending / approved / rejected)
└─ approved_by
```

**How the flexibility works:** at the start of each year (or when an employee's
type/position/department/division changes), resolve their quota from `leave_policy_master`
using the same scope resolver as salary/incentive, and write it into `leave_balances.quota`.
After that, HR can edit that specific employee's `leave_balances` row directly — e.g. give
one employee 2 extra days without changing the department-wide policy. That edit doesn't
touch `leave_policy_master`, so it doesn't affect anyone else.

**Decision (Phase 3):** approving a `leave_requests` row counts weekdays only (Mon–Fri) toward
`leave_balances.used` — it does **not** exclude company holidays inside the request range, so
a leave spanning a holiday over-deducts by that many days. **Backlogged, not accepted as
permanent:** ship the simpler weekday-only count now, but cross-referencing the holidays
master per request is a known, tracked follow-up before this is considered done.

### 5.5 HR Letters (Surat Ijin, SP & Sanksi, Surat Lembur)

```
surat_ijin                    (permission letter: late arrival / early leave)
├─ id
├─ employee_id
├─ date, type (late_arrival / early_leave)
├─ reason, time_requested
├─ status (pending / approved / rejected — `rejected` added at build time,
│           P4-T01: an approver needs a way to deny a request, mirroring
│           leave_requests and overtime_letter's own pending/x/rejected shape)
└─ approved_by

surat_peringatan              (SP / warning + sanction)
├─ id
├─ employee_id
├─ level (SP1 / SP2 / SP3)
├─ violation_description, issue_date
├─ sanction_component_id (nullable FK → payslip_component_master, if the sanction includes
│                          a salary deduction — this is how it reaches the payslip)
├─ sanction_amount (nullable)
└─ issued_by

overtime_letter                (Surat Lembur — verifies overtime actually happened that day)
├─ id
├─ employee_id, date
├─ planned_overtime_hours
├─ actual_overtime_hours (cross-checked against attendance_records after the fact)
├─ reason
├─ status (pending / verified / rejected)
└─ verified_by
```

`surat_ijin`, `surat_peringatan`, and `overtime_letter` should each generate a printable
letter (PDF), not just store data — that's the actual deliverable HR needs. `overtime_letter`
is what the payslip's overtime-pay calculation should check against (§9) — don't pay overtime
off self-reported hours alone if a verified letter exists.

### 5.6 Kasbon (Cash Advance)

```
kasbon
├─ id
├─ employee_id
├─ amount, request_date
├─ installment_count, installment_amount
├─ remaining_balance
├─ status (pending / approved / rejected / paid_off)
└─ approved_by
```

Each approved, unpaid kasbon should auto-generate a deduction line each payroll run until
`remaining_balance` hits zero. Make the "deduct installment → reduce remaining_balance" step
idempotent per payroll run — this is the one place a bug in the payroll engine directly costs
someone money.

### 5.7 Master Hari Besar (Holidays)

```
holidays
├─ id
├─ date, name
├─ source (google_calendar / manual)
└─ is_active
```

Seed/sync from Google Calendar's public Indonesian holiday feed, but let users add/edit/
remove entries locally — company-specific off days (cuti bersama, company anniversary) won't
be in Google's feed.

**Implemented (Phase 2):** `holidays` is **sync-populated, not seed-populated** — there is no
static seeder inserting a hardcoded holiday list. Instead, `POST /holidays/sync[?year=]`
fetches and parses the public Google Calendar Indonesian-holidays ICS feed live and
upserts by `date`. A static seeder would drift from the feed the moment Google's calendar
changes (a date moves, a joint-holiday gets added); syncing on demand never goes stale.
Manual rows (`source = manual`) are never touched by sync, even when their `date` coincides
with a feed entry — sync checks `source` before writing and skips/counts it instead of
overwriting, so a company's Nyepi override or cuti bersama entry survives repeated re-syncs.
The endpoint is idempotent (safe to re-run) and admin-only for the sync action itself; both
admin and HR staff can read/manually add/edit/remove.

**Decision — sync stays a manual/deploy-checklist action, not automatic on app boot:**
boot-time success must not depend on an external network call succeeding — Google's feed
could be unreachable, rate-limited, or blocked by a client's firewall, and none of that
should be able to fail or delay the app starting. Since the sync is cheap, idempotent, and
explicitly triggerable, it belongs on the go-live checklist (see §12.10) and in periodic
admin maintenance (e.g., re-run once a year for the next year's dates), not wired into
bootstrap. If a recurring nightly/monthly auto-sync is wanted later, it should ride on the
BullMQ job infrastructure introduced in Phase 8 (a scheduled job, not a boot hook) — out of
scope for now since nothing in Phases 1–3 needs it.

### 5.8 Payroll Run & Payslip

```
payroll_runs
├─ id
├─ period (e.g. 2026-07)
├─ status (draft → calculated → approved → disbursed)
├─ created_by, approved_by
└─ locked_at (once disbursed, immutable)

payslips                      (CRU only — never delete)
├─ id
├─ payroll_run_id, employee_id
├─ gross_pay, pph21_amount
├─ bpjs_kesehatan_employee, bpjs_kesehatan_company
├─ bpjs_jht_employee, bpjs_jht_company
├─ bpjs_jp_employee, bpjs_jp_company
├─ bpjs_jkk_company, bpjs_jkm_company
├─ net_pay
└─ pdf_path

payslip_line_items            (the breakdown — every earning/deduction that composed a payslip)
├─ id
├─ payslip_id
├─ component_id (FK → payslip_component_master)
├─ source (salary_master / incentive_master / temp_component / kasbon / sanction / overtime)
├─ source_id (FK back to whichever record generated this line — for traceability)
└─ amount
```

`payslip_line_items` is what makes payslips auditable — when an employee asks "why is my pay
different this month," you point at the exact rows instead of re-deriving it from scratch.

## 6. Folder Structure

Monorepo, pnpm workspaces. `apps/api` and `apps/web` share types through
`packages/shared-types` so enums like `ptkp_status`, `scope_type`, and `payroll_run.status`
can't drift between backend and frontend.

```
payroll-system/
├── apps/
│   ├── api/                          # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── employees/
│   │   │   │   │   ├── employee.controller.ts
│   │   │   │   │   ├── employee.service.ts
│   │   │   │   │   ├── employee.module.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   └── entities/
│   │   │   │   ├── ptkp/                    # §5.1a derivation service
│   │   │   │   ├── scope-resolver/          # §5.2 shared resolver — one implementation
│   │   │   │   ├── salary-master/
│   │   │   │   ├── incentive-master/
│   │   │   │   ├── payslip-components/
│   │   │   │   ├── fingerprints/
│   │   │   │   ├── attendance/
│   │   │   │   │   ├── reconciliation/      # §5.3 — tested independently
│   │   │   │   ├── leave/
│   │   │   │   ├── letters/                 # surat_ijin, surat_peringatan, overtime_letter
│   │   │   │   ├── kasbon/
│   │   │   │   ├── holidays/
│   │   │   │   ├── tax-bpjs-constants/      # PTKP master, TER brackets, BPJS rates/caps
│   │   │   │   ├── payroll-runs/
│   │   │   │   └── payslips/
│   │   │   ├── jobs/                        # BullMQ processors, §2.2
│   │   │   │   ├── payroll-calculation.processor.ts
│   │   │   │   └── pdf-generation.processor.ts
│   │   │   ├── common/
│   │   │   │   ├── guards/                  # role guards, immutability guards (§11)
│   │   │   │   ├── interceptors/
│   │   │   │   ├── filters/                 # e.g. ImmutableRecordError → 409
│   │   │   │   └── decorators/
│   │   │   ├── config/
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   └── seeders/                 # constants seed data, §10 P1-T10
│   │   │   └── main.ts
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   └── e2e/
│   │   └── package.json
│   │
│   └── web/                          # React + Vite admin UI
│       ├── src/
│       │   ├── pages/
│       │   ├── features/             # mirrors backend modules: employees, payroll, leave...
│       │   ├── components/
│       │   ├── api/                  # typed API client, uses packages/shared-types
│       │   ├── hooks/
│       │   └── routes/
│       ├── public/
│       └── package.json
│
├── packages/
│   └── shared-types/
│       ├── src/
│       │   ├── enums/                # ptkp-status.ts, scope-type.ts, payroll-run-status.ts...
│       │   ├── dto/
│       │   └── index.ts
│       └── package.json
│
├── docs/
│   └── PAYROLL_SPEC.md               # this doc
│
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## 7. PPh 21 (Income Tax) Rules

### Method: Gross (build first; Gross-up is a later premium feature)

Three methods exist (Gross / Net / Gross-up) — they differ in who bears the tax cost, not the
underlying tax math. Build Gross first: tax is deducted straight from the employee's salary,
no iterative allowance calculation needed.

### Calculation: TER (Tarif Efektif Rata-rata)

Since 1 January 2024 (PP 58/2023), monthly PPh 21 withholding uses TER — a flat percentage
applied to gross monthly income, replacing the old bracket calculation for 11 months of the
year:

```
PPh21 (Jan–Nov) = Gross Monthly Taxable Income × TER rate (looked up from bracket table)
```

**✅ Rounding rule (final) — round the monthly PPh21 to the nearest Rp 100.** Confirmed
against the official DJP calculator via worked example **WE-07** (P7-T07): bruto 9,000,100
(TK/0, TER 1.75%) = 157,501.75 → **157,500**, i.e. nearest-Rp-100 — *not* nearest-rupiah
(which gives 157,502) nor floor (157,501). Implemented as `roundToNearestHundred` in
`payroll-calculation/rounding.ts`. ⚠️ This is the *monthly* rule only — see the R7 note below
for the still-open annual-rounding question.

**December (or final month of employment):** recalculate the full year using the progressive
Pasal 17 rates on annual net income, subtract what was already withheld Jan–Nov, and true up.
Don't skip this — it's required, not optional.

### ✅ R7 RESOLVED (P7-T01) — December / annual true-up formula (final)

Confirmed against the official DJP calculator via worked example **WE-05 version (a)**:

```
Annual net income = Annual gross taxable
                    − biaya jabatan (5% of gross, capped Rp 500,000/month = Rp 6,000,000/year)
                    − employee JHT (2%) − employee JP (1%)      ← these two ONLY
PKP               = Annual net income − PTKP (rounded down to the nearest Rp 1,000)
Annual PPh21      = Pasal 17 progressive on PKP
                    (5% ≤ 60,000,000 · 15% ≤ 250,000,000 · 25% ≤ 500,000,000
                     · 30% ≤ 5,000,000,000 · 35% > 5,000,000,000)
December PPh21    = Annual PPh21 − PPh21 already withheld Jan–Nov (true-up; may be a refund)
```

**BPJS Kesehatan employee (1%) is NOT a deductible pengurang** — only JHT and JP are (WE-05
distinguished version (a) from version (b) precisely on this point). This relies on two
constant tables introduced at P7-T02: `biaya_jabatan_masters` and `pasal17_bracket_masters`,
both effective-dated like every other tax constant (§7).

⚠️ **OPEN ITEM (P7-T07) — annual rounding mode is unverified.** The *monthly* PPh21 is
confirmed round-to-nearest-100 (WE-07 above), but WE-05 (the only confirmed December example)
lands on an exact multiple of 100, so it proves nothing about the annual figure's rounding.
The annual `calculateAnnualPph21Trueup` deliberately still uses plain `Math.round` (unchanged,
not assumed to match monthly) — **do not** silently align it to round-100 without a fractional
December worked example. Carried in `04_STEPS.md` P7-T07.

### Worked-example verification status (P7-T01)

| WE | Case | Status |
|---|---|---|
| WE-04(a) | Married-female no-cert → `TK/0` | ✅ confirmed vs official calculator (R6) |
| WE-05(a) | December true-up formula | ✅ confirmed vs official calculator (R7) |
| WE-01 / WE-02 / WE-03 | TER cat A / B / C, Jan–Nov | ✅ confirmed vs official calculator (P7-T07) |
| WE-06 | TER boundary (TC-TAX-02) | ✅ confirmed — bracket/boundary + nearest-100 rounding of the +Rp1 value (226,100) |
| WE-07 | Monthly PPh21 rounding mode | ✅ confirmed — 9,000,100 → 157,500 = round-to-nearest-100 |

All Jan–Nov worked examples are reconciled. The remaining tax-engine open item is the
**annual** rounding mode (see the R7 note above) — needs a fractional December example.

### TER categories (by PTKP status)

| TER Category | PTKP Status |
|---|---|
| A | TK/0, TK/1, K/0 |
| B | TK/2, TK/3, K/1, K/2 |
| C | K/3 |

### ⚠️ All tax constants must be admin-editable AND effective-dated, not hardcoded

**PTKP amounts, TER bracket tables (by category), and every rate/cap in §8** must be stored
in editable database tables (a "Tax & Statutory Constants" section in the admin panel), with
**initial seed values following current Indonesian government rules** — not hardcoded in
business logic. Pull the official current tables from `pajak.go.id` (search PMK 168/2023 and
its lampiran) when seeding — don't hardcode numbers copied from blog aggregators, since
several sources disagree on exact figures.

**These tables also need `effective_start_date`/`effective_end_date`, not just
"editable."** A flat editable row means updating next year's PTKP amount or BPJS cap silently
changes how *last* year's payslips would recalculate if ever regenerated or audited. Give
`ptkp_master`, `ter_bracket_master`, and the BPJS rate/cap tables in §8 the same
effective-dating shape as `salary_master` (§5.2) — payroll calculation for a given period
should look up the rate that was active *for that period*, not "whatever's live now."

### Other rules to encode
- No NPWP on file → 20% surcharge on the normal rate (a flag, not a separate table)
- THR/bonuses are added to that month's gross income, not taxed separately — this can push
  an employee into a higher TER bracket for that month only
- Non-permanent/daily employees use a separate "TER Harian" table — build only if you
  actually have such employees

## 8. BPJS (Social Security) Rules

Two mandatory programs for permanent employees. **All percentages and wage caps below must
be admin-editable, effective-dated constants (see §7), seeded with current government values
as defaults.**

### BPJS Kesehatan
- Total 5% of (base salary + fixed allowances) — 1% employee, 4% company
- Wage cap: Rp 12,000,000/month (Perpres 64/2020) — verify current figure at build time

### BPJS Ketenagakerjaan
| Program | Total | Employee | Company | Notes |
|---|---|---|---|---|
| JHT (old-age savings) | 5.7% | 2% | 3.7% | No wage cap |
| JP (pension) | 3% | 1% | 2% | Wage cap applies — verify current figure, revised periodically |
| JKK (work accident) | 0.24%–1.74% | 0% | 100% | Rate depends on employer's risk class |
| JKM (death benefit) | 0.3% | 0% | 100% | — |
| JKP (job loss) | — | 0% | 0% | Government/JKK-JKM funded — no payroll deduction, safe to skip modeling |

**⚠️ The JP wage cap specifically needs verification at build time** — it's revised roughly
annually and different sources disagree on the current figure. Store it as an editable
constant, not a hardcoded number.

## 9. Payslip Calculation Logic (How Take-Home Pay Is Computed)

This is the core algorithm the payroll engine runs per employee, per run. Order matters.

**Step 1 — Resolve gross earnings.**
```
Gross Earnings = resolved base_salary (via scope resolver, §5.2)
                + resolved incentive_amount (via scope resolver)
                + sum of active payslip_temp_components (earning type, this period)
                + overtime pay (per R9 below — only for hours backed by a verified
                  overtime_letter, see §5.5)
                + THR/bonus, if paid this period
```

### ✅ R9 (P8-T04b) — Overtime pay formula (final)

Source: **PP 35/2021 Pasal 31** (Indonesian working-hours/overtime regulation). Uses
`actual_overtime_hours` from a **verified** `overtime_letter` (P4-T03) — never
`planned_overtime_hours` (TC-LETTER-03). Computed per letter (each letter = one overtime
day, so the first-hour premium applies per day):

```
hourly_rate       = monthly base_salary ÷ 173
overtime_pay(H)   = 1.5 × hourly_rate × min(H, 1)      (the first hour)
                  + 2.0 × hourly_rate × max(H − 1, 0)   (each hour after the first)
```

- **base_salary** is the employee's resolved base salary (§5.2), not gross.
- **Taxable**: yes (part of Taxable Earnings). **BPJS-eligible**: **NO** — overtime is
  one-off/incidental per Step 2, so it never enters the BPJS wage base.
- Rounded to whole rupiah per line.

**Step 2 — Split earnings by taxable/BPJS-eligible flags.**
Each component (base salary, incentive, each temp component) carries `is_taxable` on
`payslip_component_master`. Sum only the flagged components into:
- `Taxable Earnings` (feeds PPh21, Step 4)
- `BPJS-Eligible Earnings` (feeds BPJS, Step 3) — in practice this is usually base salary +
  fixed allowances, excluding one-off/incidental components

**Step 3 — Compute BPJS deductions.**
```
BPJS Kesehatan base = min(BPJS-Eligible Earnings, BPJS Kesehatan cap)
BPJS JHT base       = BPJS-Eligible Earnings (no cap)
BPJS JP base         = min(BPJS-Eligible Earnings, JP cap)

BPJS Kesehatan (employee) = 1% × BPJS Kesehatan base
BPJS JHT (employee)       = 2% × BPJS JHT base
BPJS JP (employee)        = 1% × BPJS JP base
```
(Company-side percentages are tracked too, for company cost reporting — they don't reduce
the employee's take-home pay.)

**Step 4 — Compute PPh 21.**
```
PPh21 (Jan–Nov) = Taxable Earnings × TER rate
                  (rate looked up from the bracket table matching the employee's TER
                   category — A/B/C, per §7 — and their Taxable Earnings amount)

PPh21 (December / final month) = recompute using annual progressive Pasal 17 rates on
                  (Annual Taxable Earnings − PTKP − biaya jabatan), minus tax already
                  withheld Jan–Nov → true-up (can be a refund or extra deduction)
```

**Step 5 — Apply other deductions.**
```
Other Deductions = active kasbon installment (if remaining_balance > 0, §5.6)
                  + sanction deduction (if a surat_peringatan links a component
                    with an amount for this period, §5.5)
                  + sum of active payslip_temp_components (deduction type, this period)
```

**Step 6 — Net pay (take-home).**
```
Net Pay = Gross Earnings
          − PPh21
          − BPJS Kesehatan (employee)
          − BPJS JHT (employee)
          − BPJS JP (employee)
          − Other Deductions (Step 5)
```

**Step 7 — Record every line.**
Write each contributing amount (Steps 1, 3, 4, 5) as its own row in `payslip_line_items`,
tagged with its source — this is what makes the payslip auditable later instead of a single
opaque number.

---

