# payroll-system

Single-tenant payroll + HR-letters system for Indonesian SMBs. See [docs/00_README.md](./docs/00_README.md)
for the full spec and how to point Claude/contributors at the relevant sections per session.

## Stack

- **apps/api** — NestJS backend (Sequelize + MySQL, BullMQ for background jobs)
- **apps/web** — React + Vite admin UI
- **packages/shared-types** — enums/DTOs shared between api and web

## Getting started

```bash
pnpm install
pnpm --filter @payroll-system/shared-types build   # build once before running api/web
pnpm dev:api    # NestJS on watch mode
pnpm dev:web    # Vite dev server
```

## Monorepo scripts

| Script | Does |
|---|---|
| `pnpm build` | Builds shared-types first, then all apps |
| `pnpm lint` | Lints every workspace package |
| `pnpm test` | Runs tests in every workspace package |

## Current status

Phase 1 (Foundation & Constants) in progress — see [docs/04_STEPS.md](./docs/04_STEPS.md) §10 for the
full task list and phase order.
