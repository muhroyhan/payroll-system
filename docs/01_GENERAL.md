# Payroll System — Part A: General

> Part 1 of 5. See [00_README.md](./00_README.md) for the full doc set and how to use it with Claude.
Next: [02_RULES.md](./02_RULES.md)

---

# PART A — GENERAL

## 1. Project Overview

**What:** A single-tenant payroll + HR-letters system for small businesses in Indonesia,
deployed per-client. Sellable product, not a portfolio demo — correctness matters more than
feature count.

**Who it's for:** Indonesian SMBs. One deployment = one company's payroll (single-tenant).

**Non-negotiable constraint:** Tax and BPJS calculations must be correct. Get the compliance
engine right before adding anything else — a payroll tool that looks nice but miscalculates
PPh 21 is worse than no tool at all.

**Scope size:** This is a genuinely full HR + payroll system — 12 feature areas: employee,
fingerprint attendance, kasbon, leave, permission/warning/overtime letters, holiday master,
salary/incentive masters, temp components, and the payslip engine itself.

## 2. Tech Stack

### 2.1 Stack Table

| Layer | Technology | Handles | Reason |
|---|---|---|---|
| Backend framework | NestJS | API, business logic, module structure, guards/interceptors | Already known deeply — matters for explaining/demoing this project later; structured DI makes the module-per-feature-area layout (§6) natural |
| ORM | Sequelize | Data access, migrations, models | Already known deeply; sufficient for thousands of records (not millions) — see §2.2 for why not to switch |
| Database | MySQL | Persistent storage | Relational integrity fits payroll's FK-heavy model (employees, masters, scope engine); mature tooling, cheap to host per-client |
| Frontend | React + Vite | Admin UI (HR/admin staff only — no employee self-service, §4) | Already known deeply; Vite's fast dev loop suits iterative per-phase development |
| UI component library | Ant Design (antd) | All admin UI components — tables, forms, layout, date pickers | Large, production-ready component set matches an admin-panel-heavy app (payslip tables, master CRUD forms) without hand-building components per phase |
| Styling / custom design | antd `ConfigProvider` theme tokens + CSS Modules | Global theming (colors, spacing, radius) via tokens; one-off component styling via CSS Modules | See note below — deliberately **not** styled-components |
| Server state / data fetching | TanStack React Query | API data fetching, caching, mutations, background refetch for the admin UI | Matches a CRUD-heavy admin app calling the NestJS REST API; handles loading/error/cache states that would otherwise be hand-rolled per screen |
| Queue / jobs | Redis + BullMQ | Background payroll calculation, PDF generation (§2.2) | The one stack **addition** — payroll runs and PDF rendering must not block HTTP requests; BullMQ integrates cleanly with NestJS |
| Monorepo tooling | pnpm workspaces | Shared types between `apps/api` and `apps/web` (§6) | Lightest option that solves the actual problem (shared enums/DTOs) without paying for Nx/Turborepo caching overhead this project's size doesn't need yet |
| Auth | JWT via NestJS Guards | Admin/HR login, role-based access (admin / hr staff) | Single-tenant, small user count — no need for a heavier identity provider |

**Notes:**
- **Why not styled-components:** antd (v6, via `@ant-design/cssinjs`) generates its own
  component styles — CSS Variables mode by default now that IE support is dropped, but still
  its own styling engine with its own cascade ordering. Antd's own docs keep a dedicated
  ["CSS Compatible"](https://ant.design/docs/react/compatible-style/) page specifically for
  apps that mix antd with styled-components or another CSS-in-JS library, because the two
  engines' output can conflict on specificity/order and need an explicit `@layer` +
  `StyleProvider` setup to fix. CSS Modules has no runtime and nothing to conflict with, and
  antd's theme tokens (via `ConfigProvider`) already cover most "custom design" needs (brand
  colors, spacing scale, border radius) without writing component-level CSS at all — reach
  for CSS Modules only for the styling antd's tokens don't reach.
- **Forms use antd's own `Form` component** (`Form.Item` + antd input components), not a
  separate form library (e.g. React Hook Form) — antd's form validation/state handling is
  already built for its own inputs, so adding another form library would just duplicate that
  layer for no benefit.
- **React Query is for server state only.** Local/UI-only state (modal open/closed, form
  draft values before submit, etc.) stays in plain React state/context — don't reach for a
  global client-state library (Redux, Zustand) unless a concrete cross-cutting need for one
  actually shows up; nothing in this app's scope currently needs it.
- **PDF generation library** (for payslips, surat_ijin, surat_peringatan, overtime_letter) is
  intentionally left undecided here — pick one (e.g. a headless-Chrome renderer or a
  server-side PDF template library) at Phase 4/Phase 8 build time, based on how complex the
  letter/payslip layout ends up being. Don't lock this in prematurely.
- **Testing framework** for the NestJS side should be Jest (NestJS's default) — not called out
  as its own stack row since it's not a decision point, just the standard choice.
- Do not introduce a different ORM, database, or frontend framework mid-project — see Rules
  §3 for why.

### 2.2 Handling Thousands of Records (payroll generation & other crucial features)

The failure mode to design against isn't "the database can't hold the data" — it's a payroll
run for hundreds/thousands of employees timing out an HTTP request, or a re-run accidentally
double-charging someone. Concrete practices:

- **Run payroll calculation as a background job, not inline in the API request.** Use
  BullMQ: the "Calculate Payroll Run" action enqueues a job and returns immediately; the
  admin UI polls or subscribes for progress. Store `processed_count` / `total_count` on
  `payroll_runs` so you can show a real progress bar.
- **Process employees in chunks** (e.g. 100–200 per batch) inside the job rather than one
  giant loop — easier to checkpoint, easier to retry a failed chunk without redoing the
  whole run.
- **Bulk insert, don't loop individual ORM creates.** Use Sequelize's `bulkCreate` for
  `payslip_line_items` and `payslips` per chunk instead of `.create()` in a loop — this is
  the single biggest easy win for a Sequelize+MySQL stack at this scale.
- **Pre-resolve the scope engine once per run, not once per employee.** Salary/incentive/
  leave-policy resolution (§5.2) depends on employee_type/position/department/division, not
  on the individual employee — cache resolved values per unique combination at the start of
  the run instead of re-running the resolver per employee.
- **Offload PDF generation to its own queue**, separate from the calculation job — a slow
  PDF render shouldn't block or slow down the actual payroll math.
- **Index what you query by.** Composite indexes on `(employee_id, period)` for
  `attendance_records` and `payslips`, and on `(scope_type, scope_value)` for the master
  tables in §5.2.
- **Cache read-heavy, rarely-changing data** (holidays, TER brackets, BPJS rates) in Redis
  rather than re-querying MySQL for them inside a tight per-employee loop.
- If you ever genuinely outgrow this (tens of thousands of employees, not thousands), a MySQL
  read replica for reporting/admin list views is the next lever — not a framework change.

---

