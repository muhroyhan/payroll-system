# Payroll System — Part H: Frontend Structure

> Part 3 of 4 of the frontend bundle. Previous: [07_FRONTEND_RULES.md](./07_FRONTEND_RULES.md) ·
> Next: [09_FRONTEND_STEPS.md](./09_FRONTEND_STEPS.md)
>
> This is the frontend's largest file — the screen/module inventory. Point a session at the
> **one subsection** it needs (e.g. §15.11 for the payroll run screens), not the whole file.

---

# PART H — FRONTEND STRUCTURE

## 15. Screen & Module Inventory

Every endpoint listed here was **read out of the NestJS controllers**, including its guards.
Nothing is inferred from what a screen "probably" needs. Role column legend:

| Legend | Meaning |
|---|---|
| **A+H** | `@Roles(Role.ADMIN, Role.HR_STAFF)` — both roles |
| **A** | `@Roles(Role.ADMIN)` — admin only (may be a method-level override inside an A+H controller) |
| **auth** | `@UseGuards(JwtAuthGuard, RolesGuard)` with **no** `@Roles` → any authenticated user (§13.4) |
| **public** | no guard |

Paths are relative to the API base URL. There is **no** `/api` prefix (§13.5 B-02).

---

### 15.0 Page archetypes

Four archetypes cover almost every screen. Build them once in `src/components/`, then
compose — do not hand-roll a list page per module.

| Archetype | Shape | Used by |
|---|---|---|
| **List** | antd `Table` + filter bar + "Tambah" primary action + per-row action column. Client-side pagination (§14 R-08). Empty / loading / error states from the shared wrappers. | almost everything |
| **Detail** | antd `Descriptions` for the record + `Tabs` for related collections + an action bar whose buttons obey R-06 (disabled + tooltip). | employees, payroll runs, payslips, kasbon, letters |
| **Form (create/edit)** | antd `Form` in a `Drawer` for short forms, a full page for long ones (employee, payroll-affecting masters). 400 → field errors, 409 → persistent modal (§14 R-04). | everything writable |
| **Effective-dated master** | List archetype + a "berlaku sejak / sampai" column pair, a "Retire" action that sets `effective_end_date` (never a delete, §11), and a `GET …/resolve` preview panel. | salary, incentive, leave policy, all tax constants |

**Standard row-action column**: `Lihat` · `Ubah` · `Hapus` — each independently disabled per
§15.2, each with a tooltip when disabled. A destructive action always confirms via
`Modal.confirm` first.

---

### 15.1 Route map

| Route | Screen | Min role | Feature folder |
|---|---|---|---|
| `/login` | Login | public | `features/auth` |
| `/` | Dashboard | A+H | `features/dashboard` |
| `/employees` · `/employees/new` · `/employees/:id` · `/employees/:id/edit` · `/employees/import` | Employees | A+H | `features/employees` |
| `/organization` (tabs: divisions / departments / positions / employee-types) | Org masters | A+H | `features/organization` |
| `/masters/salary` · `/masters/incentive` | Scope masters | A+H | `features/salary-master`, `features/incentive-master` |
| `/masters/payslip-components` | Payslip component master | **A** | `features/payslip-components` |
| `/masters/temp-components` | Temp components | A+H | `features/payslip-temp-components` |
| `/masters/holidays` | Holidays | A+H (sync **A**) | `features/holidays` |
| `/attendance/fingerprints` | Fingerprint enrolment | A+H | `features/fingerprints` |
| `/attendance/raw-logs` | Raw scan logs + import | A+H | `features/attendance/raw-logs` |
| `/attendance/records` · `/attendance/records/:id` | Attendance records + reconcile | A+H | `features/attendance/records` |
| `/leave/types` · `/leave/policy` · `/leave/balances` · `/leave/requests` · `/leave/requests/:id` | Leave | A+H | `features/leave/*` |
| `/letters/surat-ijin` (+`/:id`) · `/letters/surat-peringatan` (+`/:id`) · `/letters/overtime` (+`/:id`) | HR letters | A+H | `features/letters/*` |
| `/kasbon` · `/kasbon/:id` | Kasbon | A+H | `features/kasbon` |
| `/payroll-runs` · `/payroll-runs/:id` · `/payroll-runs/:id/summary` | Payroll runs | A+H (lifecycle **A**) | `features/payroll-runs` |
| `/payslips` · `/payslips/:id` | Payslips | A+H | `features/payslips` |
| `/settings/tax-constants` (4 tabs) | Tax & BPJS constants | **A** | `features/tax-bpjs-constants` |
| `/settings/salary-period` | Salary period config | auth read / **A** write | `features/salary-period-config` |
| `/settings/users` | User management | **A** | `features/users` |
| `/403` · `*` | Forbidden / Not found | — | `features/errors` |

---

### 15.2 Lock-derivability matrix — which §11 lock the UI can pre-empt

This table is the input to §14 R-06. "Derivable" means the client can decide *from data it
already has* whether to disable a control.

| Entity | §11 lock | Derivable from | UI |
|---|---|---|---|
| `leave_requests`, `surat_ijin`, `kasbon`, `overtime_letter` | not `pending` → no edit/delete/re-decide (`assertPendingStatus`, shared guard) | `status !== 'pending'` on the row | ✅ R-06a disable + tooltip |
| `kasbon` | `amount` / `installment_count` / `installment_amount` frozen once an installment is deducted | `remainingBalance < amount` | ✅ R-06a — disable those three fields specifically; the rest of the form stays editable |
| `kasbon` | `paid_off` / `rejected` are terminal | `status` | ✅ R-06a |
| `payroll_runs` | forward-only; no revert past `approved`; `disbursed` terminal | `status` | ✅ R-06a — see §15.11 |
| `attendance_records` / `fingerprints` | period locked once its run is past `draft` (`PayrollPeriodLockService`) | the record's period vs `GET /payroll-runs` statuses | ✅ R-06a — needs the runs list loaded alongside; cache it as `['payroll-runs']` and reuse |
| `payslips` | never deletable; money fields never editable | **no such endpoint exists** | ✅ simply never render the affordance (R-06) |
| `salary_master`, `incentive_master`, `leave_policy_master`, `payslip_component_master` | never hard-delete; retire via `effective_end_date` | **no DELETE endpoint exists** | ✅ never render Delete; render "Akhiri masa berlaku" instead |
| `leave_balances.used` | only the approval workflow may change it | only `PUT /:id/quota` exists | ✅ the form exposes `quota` only |
| `surat_peringatan` | locked once `sanction_amount` reached a `payslip_line_item` | ❌ **not exposed** (§13.5 B-06) | ⚠️ R-06b fallback — attempt, then explain the 409 |
| `overtime_letter` | locked once its hours fed a payslip line item | ❌ **not exposed** (§13.5 B-06) | ⚠️ R-06b fallback (in *addition* to the derivable `status` lock above) |
| `payslip_component_master` | `is_taxable` / `component_type` frozen once referenced | ❌ **not exposed** (§13.5 B-06) | ⚠️ R-06b fallback |

---

### 15.3 Auth & app shell *(backend: P1-T03)*

**Screens:** `/login`; the protected layout (antd `Layout` + `Sider` + `Header` with user
menu); `/403`; `*` not-found.

| Method | Path | Role | Used by |
|---|---|---|---|
| POST | `/auth/login` | public | Login form |

There is **no** `/auth/me`, refresh, or logout endpoint (§13.5 B-03). Session restore on
reload therefore reads persisted state only; logout is client-side token disposal.

**Nav is filtered by role and the route is guarded independently** (§14 R-11). The Sider
hides: `/masters/payslip-components`, `/settings/tax-constants`, `/settings/users` for
`hr_staff`.

**Dashboard (`/`)** is intentionally thin — it composes existing endpoints only, no new API:
latest payroll runs (`GET /payroll-runs`), counts of pending approvals across
`leave-requests` / `surat-ijin` / `overtime-letters` / `kasbon`, and the current salary
period. No new backend work; no computed figures (§14 R-07).

---

### 15.4 Employees & organization *(backend: P1-T04, P1-T05, P1-T06, Phase 2 org FKs)*

**Screens:** employee list (filterable by status/department/division/position/type), employee
detail, create/edit form, Excel/CSV import; organization masters as a 4-tab page.

| Method | Path | Role | Screen |
|---|---|---|---|
| GET | `/employees` | A+H | list |
| GET | `/employees/:id` | A+H | detail |
| POST | `/employees` | A+H | create form |
| PUT | `/employees/:id` | A+H | edit form |
| POST | `/employees/import` (multipart, field `file`) | A+H | import page |
| GET/POST/PUT/DELETE | `/divisions`, `/departments`, `/positions`, `/employee-types` | A+H | org tabs |

**Employee form specifics — all backend-owned, do not reimplement:**
- The form collects the §5.1a **raw inputs** (`maritalStatus`, `gender`, `dependentCount`,
  `wifeIncomeCombined`, `spouseNoIncomeCertificate`) and shows the **server-returned**
  `ptkpStatus`. The derivation runs on the backend (§5.1a) — the UI must **not** preview it
  client-side (§14 R-10).
- `ptkpManuallyOverridden`: exposed as an explicit "Timpa manual" switch which unlocks the
  `ptkpStatus` select. When on, the UI states that the status will no longer be recomputed
  if the raw inputs change (§5.1a) — this is a genuine surprise otherwise.
- `dependentCount` max comes from `MAX_DEPENDENT_COUNT` in shared-types, never a literal `3`
  (§14 R-05).
- `base_salary` is **not** an employee field (§5.2). The detail page instead shows the
  *resolved* value via `GET /salary-master/resolve?employeeId=…` with the winning scope level
  labelled — read-only, sourced from the API (§14 R-13).

**Immutability:** there is **no DELETE** on `/employees`. Deactivation is `status = inactive`
via the edit form; the list must not render a Delete action (§14 R-06).

**Import screen:** upload → the API returns a bulk-import result; render a per-row
success/failure table. A partial failure is normal and must be shown row-by-row, not
collapsed into one toast.

---

### 15.5 Scope masters — salary, incentive, leave policy *(backend: P2-T01…T04)*

All three share the **effective-dated master** archetype (§15.0) and the same scope-selector
component (`scope_type` select → dependent `scope_value` picker whose option source switches
with the type).

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/salary-master` · `/incentive-master` · `/leave-policy-master` | A+H | list |
| GET | `/salary-master/resolve?employeeId&asOf` | A+H | resolved-value preview |
| GET | `/incentive-master/resolve?employeeId&asOf` | A+H | idem |
| GET | `/leave-policy-master/resolve?leaveTypeId&employeeId&asOf` | A+H | idem |
| GET | `/{master}/:id` | A+H | detail |
| POST / PUT | `/{master}` · `/{master}/:id` | A+H | create / edit |

**UI must reflect (not reimplement) the §5.2 priority.** Rows are grouped/ordered by
`SCOPE_TYPE_PRIORITY` from shared-types with the specificity shown as a badge
(`employee > division > department > position > employee_type`). The *winner* for a given
employee is always whatever `…/resolve` returns — never picked client-side (§14 R-13).

**Immutability (§11):** no DELETE endpoint exists on any of the three. The row action is
**"Akhiri masa berlaku"**, which opens the edit form focused on `effectiveEndDate`. A row
whose `effectiveEndDate` is in the past renders as a muted "Kedaluwarsa" tag and is excluded
from the default filter. The list must explain, once, why deletion isn't offered ("aturan
lama harus tetap bisa direproduksi oleh payroll run terdahulu").

---

### 15.6 Payslip component master & temp components *(backend: P1-T07, P6-T01)*

| Method | Path | Role | Screen |
|---|---|---|---|
| GET | `/payslip-components` | **A** | component master list |
| GET | `/payslip-components/:id` | **A** | detail |
| POST / PUT | `/payslip-components` · `/:id` | **A** | create / edit |
| GET | `/payslip-temp-components` | A+H | temp component list |
| GET | `/payslip-temp-components/active?employeeId&asOf` | A+H | "yang aktif untuk karyawan ini" preview |
| GET | `/payslip-temp-components/:id` | A+H | detail |
| POST / PUT / DELETE | `/payslip-temp-components` · `/:id` | A+H | create / edit / delete |

**Note the role split** — the component *master* is admin-only, but the *temp components* that
reference it are admin+HR. The temp-component form therefore needs the component list, which
HR staff **cannot** fetch from `/payslip-components`. **Flag this to the backend**: either
relax the master's read to A+H, or the temp-component response must embed the component name.
Until resolved, the temp-component form for an HR user shows component names only if the API
includes them — do not call an endpoint the role cannot access and swallow the 403.

**Temp components** are period-bound (`periodYear`/`periodMonth`), so the list defaults to the
current period with a period switcher, and uses the same scope-selector as §15.5.

**Immutability:** `payslip-components` has **no DELETE** (§11 — never hard-delete). The
`is_taxable` / `component_type` fields become immutable once referenced, which is **not
observable client-side** — R-06b fallback applies (§15.2), and the form warns before saving
that changing these on a used component will be rejected.

---

### 15.7 Holidays *(backend: P2-T06)*

| Method | Path | Role | Screen |
|---|---|---|---|
| GET | `/holidays?from&to` | A+H | list / calendar |
| POST | `/holidays/sync?year` | **A** | "Sinkronkan dari Google Calendar" |
| POST / PUT / DELETE | `/holidays` · `/:id` | A+H | manual entries |

**Sync is admin-only inside an otherwise A+H controller** — the button is rendered for HR
staff **disabled** with a tooltip, not hidden (§14 R-11), because its absence would look like
a bug on a page they can otherwise fully edit.

Sync never overwrites `source = manual` rows (§5.7); the UI must state this near the button
and tag each row by `HolidaySource` so the distinction is visible *before* syncing. Sync is
idempotent — the result summary (created/updated/skipped) is shown after it runs.

---

### 15.8 Attendance *(backend: P3-T01, P3-T02, P3-T03)*

Three screens under one nav group.

**A. Fingerprints** — enrolment mapping (`employee_id` ↔ `device_user_id` + `device_id`).

| Method | Path | Role |
|---|---|---|
| GET / GET `:id` / POST / PUT `:id` / DELETE `:id` | `/fingerprints` | A+H |

**B. Raw logs** — read-only evidence trail + the two ingestion paths.

| Method | Path | Role | Screen |
|---|---|---|---|
| GET | `/attendance-raw-logs?deviceUserId&deviceId` | A+H | list (**filter required**, §14 R-08) |
| POST | `/attendance-raw-logs/import` (multipart, field `file`) | A+H | file import |
| POST | `/attendance-raw-logs/bulk` | A+H | (API-pull path — normally a cron, not a screen) |
| POST | `/attendance-raw-logs` | A+H | single manual entry |
| DELETE | `/attendance-raw-logs/:id` | A+H | remove a bad scan |

Note `scanType` may legitimately be null — the device often doesn't report in/out and
reconciliation infers it from order (§5.3). Render null as "—" with a tooltip, not as an
error.

**C. Attendance records** — the reconciled data payroll actually uses.

| Method | Path | Role | Screen |
|---|---|---|---|
| GET | `/attendance-records?employeeId&from&to` | A+H | list (**filter required**) |
| GET | `/attendance-records/:id` | A+H | detail |
| POST | `/attendance-records/reconcile` `{employeeId, from, to, overwrite}` | A+H | "Rekonsiliasi" action |
| POST | `/attendance-records` | A+H | manual upsert (`overwrite` flag) |
| POST | `/attendance-records/csv-import` | A+H | CSV import |

**There is no PUT and no DELETE.** All writes funnel through the upsert, which is where the
period lock is enforced. A "correction" is a re-upsert with `overwrite: true`, and the UI must
present it that way — the edit form posts to `POST /attendance-records` with
`overwrite: true`, and surfaces the 409 *"…already exists from source "x" — pass overwrite=true"*
as a confirm dialog ("Timpa data dari sumber X?") rather than an error (§14 R-04).

**Immutability — this is the most user-visible lock in the app (§11 / TC-PAYROLL-04):**
- Load `GET /payroll-runs` alongside the records query. If the filtered period has a run past
  `draft`, render a **persistent banner** at the top: *"Periode 2026-07 terkunci — payroll run
  sudah `calculated`. Kembalikan run ke draft dulu untuk mengubah absensi."* with a link to
  that run.
- Every write control on the page (reconcile, manual entry, CSV import, overwrite) is
  **disabled** in that state, each with the same tooltip (R-06a).
- The four resolved flags (`isHoliday`, `isOnLeave`, `hasPermission`, plus a
  missed-scan/incomplete indicator) render as antd `Tag`s in the table so a reviewer can scan
  a month at a glance. `source` (`AttendanceSource`) is always shown — it decides overwrite
  precedence.

---

### 15.9 Leave *(backend: P3-T04, P3-T05)*

Four screens under one nav group: types, policy master, balances, requests.

| Method | Path | Role | Screen |
|---|---|---|---|
| GET / POST / PUT `:id` / DELETE `:id` | `/leave-types` | A+H | types |
| — | `/leave-policy-master` (see §15.5) | A+H | policy master |
| GET | `/leave-balances?employeeId&year` | A+H | balances list |
| POST | `/leave-balances/resolve` | A+H | "Ambil kuota dari kebijakan" (one employee) |
| POST | `/leave-balances/resolve-for-leave-type` | A+H | bulk year-start seeding |
| PUT | `/leave-balances/:id/quota` | A+H | edit quota |
| GET | `/leave-requests?employeeId` · `/leave-requests/:id` | A+H | request list / detail |
| POST / PUT `:id` / DELETE `:id` | `/leave-requests` | A+H | create / edit / delete |
| PUT | `/leave-requests/:id/approve` · `/reject` | A+H | approval actions |

**Balances screen:** shows `quota` / `used` / sisa and the `manuallyAdjusted` flag as a tag.
**`used` is not editable** — the API exposes only `PUT /:id/quota` (§11), so the form has one
field. Do not add a `used` input "for convenience".

**Requests state machine** — `pending → approved | rejected`, terminal:

```
   ┌────────┐   approve   ┌──────────┐
   │pending │────────────▶│ approved │   terminal
   └───┬────┘             └──────────┘
       │ reject           ┌──────────┐
       └─────────────────▶│ rejected │   terminal
                          └──────────┘
```

Render as an antd `Steps`/`Tag` pair on the detail page, not a bare status string.
Approve/Reject appear **only** while `pending`; Edit/Delete are **disabled once decided**
(`assertPendingStatus`, §15.2) with the tooltip *"Pengajuan sudah diputuskan — buat pengajuan
baru untuk koreksi."*

**Known backend behaviour to surface, not to duplicate:** approval rejects with 409 when the
request exceeds the remaining balance (TC-LEAVE-04), and day counting is **weekdays only,
holidays not excluded** (§5.4, a tracked backlog item). The request form shows the requested
weekday count as returned/implied by the API and a note that holidays inside the range are
still counted — it must **not** compute an alternative number client-side (§14 R-07/R-10).

---

### 15.10 HR letters *(backend: P4-T01, P4-T02, P4-T03)*

Three sibling screens. All three expose a PDF download.

**A. Surat Ijin** — `pending → approved | rejected`

| Method | Path | Role |
|---|---|---|
| GET `/surat-ijin?employeeId` · GET `/:id` | | A+H |
| GET `/surat-ijin/:id/pdf` (StreamableFile) | | A+H |
| POST · PUT `/:id` · DELETE `/:id` | | A+H |
| PUT `/:id/approve` · `/:id/reject` | | A+H |

Same state machine and lock treatment as leave requests (§15.9). An approved surat ijin feeds
`has_permission` on attendance (P4-T04) — the detail page links to the affected attendance
date so the effect is traceable.

**B. Surat Peringatan (SP + sanksi)** — no approval workflow; `SPLevel` = SP1/SP2/SP3.

| Method | Path | Role |
|---|---|---|
| GET `/surat-peringatan?employeeId` · GET `/:id` · GET `/:id/pdf` | | A+H |
| POST · PUT `/:id` · DELETE `/:id` | | A+H |

The sanction pair (`sanctionComponentId` → a `payslip_component_master` row,
`sanctionAmount`) is optional; when set, the form must make clear this becomes a **payslip
deduction** (§5.5). ⚠️ The component picker needs `/payslip-components`, which is **admin-only**
— same gap as §15.6; flag it rather than working around it.

**Immutability:** locked once the sanction reached a payslip line item — **not client-visible**
(§13.5 B-06). R-06b fallback: Edit/Delete stay enabled, and the 409 (*"…its sanction has
already been pulled into a payslip line item… a correction is a new SP or a reversal line in a
later period"*) is surfaced as a persistent modal.

**C. Overtime letter (Surat Lembur)** — `pending → verified | rejected`

| Method | Path | Role |
|---|---|---|
| GET `/overtime-letters?employeeId` · GET `/:id` · GET `/:id/pdf` | | A+H |
| POST · PUT `/:id` · DELETE `/:id` | | A+H |
| PUT `/:id/verify` · `/:id/reject` | | A+H |

The detail page must display `plannedOvertimeHours` and `actualOvertimeHours` side by side and
state plainly that **payroll pays `actual`, only when `verified`** (§9 R9 / TC-LETTER-03/04) —
this is the single most misunderstood rule in the letters module, and showing both numbers
without saying which one pays is how it gets misunderstood.

**Two stacked locks:** `status !== 'pending'` (derivable → R-06a) **and** payslip-reference
(not derivable → R-06b). Both must be handled; the second is the reason a `verified` letter
can still fail to edit even after the first is understood.

**PDF download** for all three: `GET /:id/pdf` returns a `StreamableFile` and requires the
`Authorization` header — so it **cannot** be a plain `<a href>`. Fetch as a blob through the
shared axios instance, then `URL.createObjectURL` + a synthetic download. Build this once as
`useDownloadPdf(url, filename)` and reuse across all three letters (and the payslip, once
§13.5 B-05 is resolved).

---

### 15.11 Kasbon *(backend: P5-T01, P5-T02, P5-T03)*

| Method | Path | Role |
|---|---|---|
| GET `/kasbon?employeeId` · GET `/:id` | | A+H |
| POST · PUT `/:id` · DELETE `/:id` | | A+H |
| PUT `/:id/approve` · `/:id/reject` | | A+H |

**State machine** — `pending → approved | rejected`, and `approved → paid_off` (driven by
payroll deductions, not by a user action):

```
  ┌────────┐  approve  ┌──────────┐  remaining_balance → 0   ┌──────────┐
  │pending │──────────▶│ approved │─────────────────────────▶│ paid_off │
  └───┬────┘           └──────────┘   (by the payroll run,   └──────────┘
      │ reject                          not by the user)
      ▼
  ┌──────────┐
  │ rejected │
  └──────────┘
```

Render the repayment as an antd `Progress` bar over `(amount − remainingBalance) / amount` —
that is a display ratio of API-returned values, which R-07 permits; it is not a money
derivation.

**Immutability, and this one is layered (§11):**
1. `status !== 'pending'` → Edit/Delete disabled entirely (shared approval guard).
2. Once **any** installment has been deducted (`remainingBalance < amount`), the three
   money fields `amount` / `installmentCount` / `installmentAmount` are frozen — even though
   the record is otherwise still `approved` and live. The edit form must disable **those three
   inputs specifically**, tooltip: *"Sudah ada potongan berjalan — buat kasbon baru untuk
   koreksi."* Both are derivable client-side (§15.2), so R-06a applies with no fallback.
3. `paid_off` and `rejected` are terminal — the API rejects edits with distinct 409s.

The detail page should list the deductions this kasbon has produced (from the payslip line
items that cite it) so "why can't I edit this" is answerable on the same screen.

---

### 15.12 Payroll runs *(backend: P8-T01, P8-T02, P8-T06)*

The centrepiece screen, and the one where the state machine must be **visual, not textual**.

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/payroll-runs` | A+H | list |
| GET | `/payroll-runs/:id` | A+H | detail — **also carries `processedCount`/`totalCount`** |
| POST | `/payroll-runs` | A+H | create for a period (`YYYY-MM`) |
| POST | `/payroll-runs/:id/calculate` | **A** | **202 Accepted**, enqueues the BullMQ job |
| PUT | `/payroll-runs/:id/approve` | **A** | |
| PUT | `/payroll-runs/:id/disburse` | **A** | |
| PUT | `/payroll-runs/:id/revert` | **A** | back to `draft` |
| GET | `/payroll-runs/:id/summary` | A+H | JSON summary (409 while `draft`) |
| GET | `/payroll-runs/:id/summary/csv` | A+H | CSV `StreamableFile` |

**State machine visualisation (required, §11 forward-only):**

```
   ┌───────┐  calculate  ┌────────────┐  approve  ┌──────────┐  disburse  ┌────────────┐
   │ draft │────────────▶│ calculated │──────────▶│ approved │───────────▶│ disbursed  │
   └───────┘   (async    └─────┬──────┘           └──────────┘            │ 🔒 locked  │
       ▲        job)           │                                          └────────────┘
       └───────────────────────┘
             revert  (ONLY from `calculated` — impossible past `approved`)
```

Build this as an antd `Steps` component with `current` from `PayrollRunStatus` and the
**revert edge drawn explicitly** — a status string alone does not tell an admin that revert
stops being available after approval, which is the single most consequential irreversible
step in the product. Requirements:
- Each step shows who/when where the data exists (`createdBy`, `approvedBy`, `lockedAt`).
- The **disbursed** step renders a lock icon and the text *"terkunci permanen — tidak ada
  jalur revert"*.
- The **next legal action** is the page's single primary button; every other lifecycle action
  is either hidden (illegal transition) or disabled with a reason.

**Async calculation (§2.2, P8-T02) — the only polling screen in the app:**
- `POST /:id/calculate` returns **202** and the run stays `draft` until the job finishes.
  Treat 202 as "started", never as "done".
- Show an antd `Progress` from `processedCount / totalCount` (a count ratio — permitted by
  R-07), polled via React Query `refetchInterval` on `['payroll-runs', id]` (§13.3), enabled
  **only** while a calculation is in flight and stopped once `status` becomes `calculated`.
  Never a bare `setInterval`.
- A retry re-chunks from the start (P8-T04 note) — progress may visibly restart. Say so in the
  UI rather than letting it look like a bug.

**Revert is destructive and must be confirmed as such.** Per §11/P8-T07 it deletes the run's
payslips + line items and rolls back kasbon installments in one transaction. The confirm
modal must enumerate those consequences — not ask "Yakin?".

**Role split within one screen:** HR staff can view runs, create them, and read the summary,
but **all four lifecycle actions are admin-only**. Those buttons render disabled with
*"Hanya admin"* for HR staff (§14 R-11) — hiding them would misrepresent the workflow to the
person who prepares it.

**Summary screen (`/payroll-runs/:id/summary`, P8-T06):** totals + per-department breakdown,
straight from `GET /:id/summary` (`PayrollRunSummary` → `totals` + `byDepartment`, each with
`employeeCount`, `grossPay`, `taxableGross`, `pph21Amount`, the eight BPJS employee/company
fields, `netPay`). **Aggregation is server-side and must not be recomputed** (§14 R-07). A
`draft` run returns **409** — the screen renders that as an explanatory empty state ("belum
ada payslip — jalankan kalkulasi dulu"), not an error toast. CSV export downloads via the
same blob helper as the letters (§15.10).

---

### 15.13 Payslips *(backend: P8-T04, P8-T05)*

| Method | Path | Role |
|---|---|---|
| GET | `/payslips?payrollRunId` | A+H |
| GET | `/payslips/:id` | A+H |

**Read-only by construction — there is no POST, PUT, or DELETE** (§11: "CRU only, never
delete"; no mutation endpoint exists). The UI renders no edit or delete affordance anywhere,
and the payslip detail page states that corrections happen via a run revert (`calculated`
only) or a superseding entry in a later period.

**Detail page** = the audit view §5.8 exists for: header totals (`grossPay`, `pph21Amount`,
the eight BPJS fields, `netPay`) plus the **`payslip_line_items` breakdown grouped by
`PayslipLineSource`** — `salary_master`, `incentive_master`, `temp_component`, `kasbon`,
`sanction`, `overtime`, `tax`, `bpjs`. Each line shows its component name, amount, and source;
lines whose `sourceId` is non-null deep-link to the originating record (the kasbon, the SP, the
overtime letter). `tax`/`bpjs` lines have a **null `sourceId` by design** — render them
without a link, not as broken links.

**⛔ PDF download is blocked** — see §13.5 B-05. `pdfPath` is a server filesystem path, not a
URL, and no `GET /payslips/:id/pdf` route exists. The button is specified here but cannot be
implemented until the endpoint lands (FE-T31); do not build a workaround that exposes
`pdfPath` to the browser.

---

### 15.14 Tax & statutory constants, salary period, users *(backend: P1-T08, P1-T09, P7-T02)*

**Tax & BPJS constants (`/settings/tax-constants`) — admin-only, 4 tabs**, all sharing the
effective-dated master archetype:

| Method | Path | Role |
|---|---|---|
| GET · GET `/effective?asOf` · GET `/:id` · POST · PUT `/:id` | `/tax-bpjs-constants/ptkp-master` | **A** |
| GET · GET `/effective?asOf[&category]` · GET `/:id` · POST · PUT `/:id` | `/tax-bpjs-constants/ter-bracket-master` | **A** |
| GET · GET `/effective?asOf` · GET `/:id` · POST · PUT `/:id` | `/tax-bpjs-constants/bpjs-kesehatan-master` | **A** |
| GET · GET `/effective?asOf` · GET `/:id` · POST · PUT `/:id` | `/tax-bpjs-constants/bpjs-ketenagakerjaan-master` | **A** |

Every tab needs an **effective-date picker** driving `?asOf`, because §7's whole point is that
a period resolves the rate that was active *for that period*. The screen must show which row
is currently effective and never imply "the live row is the one that always applied".

⚠️ **Only four of six tax constant tables have an API.** `biaya_jabatan_master` and
`pasal17_bracket_master` have entities but no controller/service (§13.5 B-07), so the December
true-up constants (§7 R7) are **not admin-editable**. The screen must state this explicitly
rather than silently presenting four tabs as complete coverage.

No values are hardcoded in the frontend — not in a placeholder, not in a helper text, not in a
validation rule (§14 R-05).

**Salary period config (`/settings/salary-period`):**

| Method | Path | Role |
|---|---|---|
| GET | `/salary-period-config` | **auth** (no `@Roles` — any logged-in user) |
| PUT | `/salary-period-config` | **A** |

The read/write role asymmetry is real and must be reflected: HR staff see the config
read-only.

**Users (`/settings/users`) — admin-only:**

| Method | Path | Role |
|---|---|---|
| GET | `/users` | **A** |
| POST | `/users` | **A** |

**There is no PUT and no DELETE on `/users`** — no edit, no deactivate, no password reset via
the API, even though `User.isActive` gates login (§13.4). Render create + list only; flag the
missing lifecycle to the backend rather than building UI for endpoints that don't exist.

---

### 15.15 Navigation by role

| Nav group | Items | `admin` | `hr_staff` |
|---|---|---|---|
| Beranda | Dashboard | ✅ | ✅ |
| Karyawan | Employees, Organization | ✅ | ✅ |
| Master | Salary, Incentive, Temp components, Holidays | ✅ | ✅ |
| Master | Payslip components | ✅ | ❌ hidden |
| Absensi | Fingerprints, Raw logs, Records | ✅ | ✅ |
| Cuti | Types, Policy, Balances, Requests | ✅ | ✅ |
| Surat | Ijin, Peringatan, Lembur | ✅ | ✅ |
| Kasbon | Kasbon | ✅ | ✅ |
| Payroll | Runs, Payslips | ✅ | ✅ (lifecycle actions disabled) |
| Pengaturan | Tax constants, Users | ✅ | ❌ hidden |
| Pengaturan | Salary period | ✅ | ✅ (read-only) |

Derived from a single `src/routes/access.ts` map that both the Sider and the route guards
consume (§14 R-11).

---
