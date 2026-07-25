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
# edit apps/api/.env if your local MySQL/Redis differ from the defaults

# 4. Build shared types (required before running api/web)
pnpm --filter @payroll-system/shared-types build

# 5. Migrate + seed the database
pnpm --filter @payroll-system/api db:migrate
pnpm --filter @payroll-system/api db:seed

# 6. Run
pnpm dev:api    # NestJS on http://localhost:3000
pnpm dev:web    # Vite dev server on http://localhost:3001
```

Default seeded admin login: `admin@payroll-system.local` / `ChangeMe123!` (override via
`ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env` before seeding).

## Monorepo Structure

```
apps/api               NestJS backend
apps/web               React + Vite admin UI
packages/shared-types  Enums/DTOs shared between api and web
docs/                  Project spec, architecture rules, phase plan, test boundaries
docker-compose.yml     Local MySQL + Redis
```

## Documentation

- **./manuals/user_manual.docs** — how to use the application
- **./manuals/tech_manual.docs** — architecture, API reference, database schema
- **[docs/](./docs/)** — the original project spec this system was built against
  (rules, phased build plan, test/boundary definitions)

## Project Status

Phases 1–8 (core payroll build) and Phase 10 (testing & go-live validation) are complete.
Phase 9 (nice-to-have features) is deferred — not implemented, not required for
production use.

Two pre-production open items remain — see
[docs/04_STEPS.md](./docs/04_STEPS.md) for details:
- Annual/December PPh21 rounding mode is unverified (monthly rounding is confirmed).
- BPJS JKK company rate needs confirming against this employer's actual registered risk
  class.
