# Payroll System

Single-tenant payroll + HR-letters system for Indonesian SMBs — handles attendance,
leave, HR letters (izin/peringatan/lembur), kasbon, PPh21/BPJS calculation, and payslip
generation for internal HR/finance staff.

## Tech Stack

- **Backend** — NestJS, Sequelize (MySQL), BullMQ (background jobs)
- **Frontend** — React + Vite, antd
- **Shared** — `packages/shared-types` (enums/DTOs shared between api and web)
- **Monorepo** — pnpm workspaces

## Prerequisites

- Node.js >= 20
- pnpm 10.x (`corepack enable` will pick up the pinned version automatically)
- MySQL 8.x and Redis 7.x — or just Docker (see below)

## Quick Start

```bash
git clone <repo-url>
cd payroll-system

# 1. Install dependencies
pnpm install

# 2. Start MySQL + Redis
docker compose up -d

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# edit apps/api/.env if your local MySQL/Redis differ from the defaults;
# apps/web/.env only needs changing if the API doesn't run on localhost:3000

# 4. Build shared types (required before running api/web)
pnpm --filter @payroll-system/shared-types build

# 5. Migrate + seed the database
pnpm --filter @payroll-system/api db:migrate
pnpm --filter @payroll-system/api db:seed

# 6. Run (two terminals)
pnpm dev:api    # NestJS on http://localhost:3000
pnpm dev:web    # Vite dev server on http://localhost:3001
```

Default seeded admin login: `admin@payroll-system.local` / `ChangeMe123!` (override via
`ADMIN_EMAIL`/`ADMIN_PASSWORD` in `apps/api/.env` before seeding).

### Environment variables

**`apps/api/.env`** (see `apps/api/.env.example`):

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | |
| `PORT` | `3000` | API port |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | MySQL, matches `docker-compose.yml` |
| `DB_USERNAME` / `DB_PASSWORD` | `payroll` / `payroll` | |
| `DB_DATABASE` | `payroll_system` | |
| `DB_LOGGING` | `false` | Set `true` to log every SQL query |
| `REDIS_HOST` / `REDIS_PORT` | `127.0.0.1` / `6379` | BullMQ (payroll calculation + PDF generation queues) |
| `JWT_SECRET` | `change-me-in-production` | **Must** be changed for any non-local deployment |
| `JWT_EXPIRES_IN` | `8h` | No refresh-token endpoint exists — session ends when this expires |
| `CORS_ORIGIN` | `http://localhost:3001` | Comma-separated allowed origins for `apps/web` |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `Default Admin` / `admin@payroll-system.local` / `ChangeMe123!` | Used only by the `seed-admin-user` seeder |

**`apps/web/.env`** (see `apps/web/.env.example`):

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Must match (or be allowed by) the API's `CORS_ORIGIN` |

### Docker (MySQL + Redis only)

`docker compose up -d` starts two containers defined in `docker-compose.yml`:

- `mysql:8.4` on `3306`, database `payroll_system`, user/password `payroll`/`payroll`
- `redis:7-alpine` on `6379`

Both persist data in named volumes (`payroll_mysql_data`, `payroll_redis_data`) so `docker
compose down` (without `-v`) keeps your data across restarts. The API and web app themselves
run directly on the host via `pnpm dev:api` / `pnpm dev:web` — they are not containerized.

## Monorepo Structure

```
apps/api               NestJS backend
apps/web               React + Vite admin UI
packages/shared-types  Enums/DTOs shared between api and web
docs/                  Project spec, architecture rules, phase plan, test boundaries
docker-compose.yml     Local MySQL + Redis
```

## Documentation

- **[manuals/user_manual.docx](./manuals/user_manual.docx)** — how to use the application,
  written for HR staff/admin (non-technical)
- **[manuals/tech_manual.docx](./manuals/tech_manual.docx)** — architecture, backend design
  patterns, frontend conventions, and the payroll run lock system, written for
  developers/maintainers
- **[docs/](./docs/)** — the original project spec this system was built against (rules,
  phased build plan, screen-by-screen frontend structure, test/boundary definitions); these
  stay as internal technical references, not end-user documentation

## Project Status

**Backend** — Phases 1–8 (core payroll build) and Phase 10 (testing & go-live validation)
are complete. Phase 9 (nice-to-have features: gross-up, multi-location, fingerprint API
polling) is deferred — a deliberate decision, not an oversight; not implemented, not
required for production use.

**Frontend** — FE-T01 through FE-T34 are complete: the full admin UI (employees, attendance,
leave, HR letters, kasbon, temp salary components, tax/BPJS constants, payroll run lifecycle,
payslips, dashboard) is built against `apps/api`, role-gated for `admin`/`hr_staff`, and has
passed a full lock-audit + role-audit + end-to-end UI smoke test (see
`manuals/tech_manual.docx` for the state machine and lock system, and the sign-off checklist
referenced there).

Open items, none of which block current use — see
[docs/04_STEPS.md](./docs/04_STEPS.md) and `manuals/tech_manual.docx` for details:
- Annual/December PPh21 rounding mode is unverified against an official DJP calculator
  (monthly rounding is confirmed).
- BPJS JKK company rate needs confirming against this employer's actual registered risk
  class.
- A handful of smaller backend gaps (server-side pagination now covers employees/kasbon/
  leave-requests only, not every listing; two tax-constant tables without an admin UI;
  two §11 locks not yet exposed as a flag the frontend can pre-empt) are accepted with
  their consequence documented in the frontend code — see the tech manual.
- Payroll run periods can still be duplicated (no unique constraint on `period`), backend
  error messages are still mostly English with raw entity IDs, and the raw attendance log
  screen has three known gaps (scan time shows date-only, no fingerprint cross-check,
  device fields are free text instead of a picker) — see `manuals/tech_manual.docx` §13.6
  for the full still-open list.

## Recent Fixes (Test-Case-Driven UX/Bugfix Rounds)

Three rounds of fixes landed from live-executing `manuals/test_cases.xlsx` against a
running instance (not just reading the spec) — commits `fix category 1 from test case`,
`fix category 2 test case`, and `kategori 3` / `more fixes` / `fix`. Highlights: server-side
pagination + debounced search for employee pickers, a redesigned sider (icons, collapsible
groups, hamburger toggle, sticky on scroll, clickable breadcrumb), auto-calculated kasbon
installments (floor + remainder-on-last-installment), a step-level progress log for payroll
run calculation, actor names instead of raw user IDs throughout, a CSV-import screen for
attendance records (ATT-006), and a payslip correction-guidance banner (PAYSLIP-003).

Full before/after detail, verification notes, and — importantly — the items that were
checked and found **still open** (duplicate payroll periods, inconsistent Indonesian error
messages, three raw-attendance-log gaps) live in `manuals/tech_manual.docx` §13 and
`manuals/user_manual.docx` §13. Don't assume a `manuals/test_cases.xlsx` BUGS-sheet item is
closed without checking there first — several are intentionally still open.
