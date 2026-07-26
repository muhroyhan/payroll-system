# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## E2E tests (Playwright)

Automated regression suite that replaced the ad-hoc manual-Puppeteer-in-browser
verification pattern used throughout FE-T17/T26-31/T33/T34 (`docs/09_FRONTEND_STEPS.md`).
It runs against the **real stack** — Docker MySQL/Redis, the real NestJS API, the real
Vite dev server — no mocked network layer, so a regression that only shows up against
real data (a real BullMQ calculation job, a real §11 lock, a real 409) gets caught too.

### Prerequisites (must already be running)

```
docker compose up -d          # from the repo root — MySQL + Redis
pnpm --filter @payroll-system/api db:migrate
pnpm --filter @payroll-system/api db:seed     # creates the default admin user
pnpm dev:api                  # NestJS API on :3000
pnpm dev:web                  # Vite dev server on :3001
```

The suite does **not** start any of these itself (no Playwright `webServer` entry) —
`global-setup.ts` checks all of them are reachable first and fails fast with a clear
message naming whichever one isn't, rather than every test failing individually with a
cryptic connection error.

### Running it

```
pnpm --filter @payroll-system/web test:e2e          # headless, once
pnpm --filter @payroll-system/web test:e2e:report    # open the last HTML report
```

First time only: `pnpm --filter @payroll-system/web exec playwright install chromium`
(downloads the browser binary; not part of `pnpm install` since pnpm's
`onlyBuiltDependencies` — see `pnpm-workspace.yaml` — intentionally keeps postinstall
scripts opt-in).

`test:e2e` always runs a `pretest:e2e` hook first (`vitest run
e2e/support/enums.spec.ts`) — a fast, DB-less check that `e2e/support/enums.ts`'s
local enum mirror (see the next section) still matches the real
`@payroll-system/shared-types` values. It fails loudly with an "update manual"
message on any mismatch, so a silent drift there gets caught before the Playwright
suite runs against a possibly-stale mirror, not after. Run it standalone with
`pnpm --filter @payroll-system/web test:e2e:enums-check`.

### How it's organized (`apps/web/e2e/`)

- `specs/` — one file per risk category from the task brief, in priority order:
  `payroll-run-lifecycle` (the full draft→calculate→approve→disburse→revert state
  machine), `section11-locks` (attendance period-lock banner, kasbon field-freeze,
  letters' R-06a/R-06b lock patterns), `role-access` (HR nav + direct-URL admin route
  guard), `prorate-and-exclusion` (mid-period resignation + negative take-home).
- `support/` — `apiClient.ts` (fixture setup goes through the real HTTP API, never a
  mock), `fixtures.ts` (typed builders per entity + the cascade-delete cleanup), `db.ts`
  (direct MySQL access — cleanup only, never setup or assertions), `session.ts` (reuses
  one login per role for the whole run — see below), `env.ts` (every overridable env
  var, defaulted to match `apps/api/.env` / `docker-compose.yml` exactly).
- `global-setup.ts` — logs in as admin and an idempotently-created HR test user
  **exactly once each** for the whole suite. `POST /auth/login` is throttled to 5
  req/min (`auth.controller.ts`), so every test reads the resulting token back from
  `e2e/.auth/tokens.json` instead of logging in itself; UI tests reuse a saved
  browser `storageState` for the same reason (no `/login` round trip per test).
- `global-teardown.ts` — a **safety net**, not the primary cleanup path. Every test's
  own `afterEach` already deletes exactly what it created (`FixtureSet.cleanup()`).
  This only matters if a test process dies mid-run before that `afterEach` fires: it
  sweeps anything still tagged as this suite's fixture data (employee/org-master names
  prefixed `E2E_TEST_FIXTURE`, payroll runs in the reserved `2099-*` period range) and
  then re-counts to confirm the DB actually came back clean, throwing if not.

### Why direct DB access for cleanup, if setup goes through the API?

Several entities this suite deliberately drives into a locked state (§11) have **no
delete endpoint once locked** — an approved `surat_ijin`, a `payroll_run`, a kasbon
mid-deduction — by design, not by omission (`docs/05_BOUNDARIES_AND_TESTS.md` §11).
Fixture teardown therefore uses a direct MySQL connection, exactly the same pattern
`apps/api/test/*.e2e-spec.ts` already uses for its own cleanup (see
`prorate-and-exclusion.e2e-spec.ts`'s `afterAll`) — real model deletes, not a REST
`DELETE` call. Setup and every assertion still go through the real API and real UI;
only teardown reaches past them.
