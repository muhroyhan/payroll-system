// Central place for every env var the e2e suite reads. Defaults mirror
// apps/api/.env and docker-compose.yml exactly, so the suite runs with zero
// config against the standard local dev setup (Docker MySQL/Redis + `pnpm
// dev:api` + `pnpm dev:web`) — override any of these only for a non-default
// setup (CI, a different port, etc).
function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const WEB_BASE_URL = env('E2E_WEB_BASE_URL', 'http://localhost:3001');
export const API_BASE_URL = env('E2E_API_BASE_URL', 'http://localhost:3000');

export const DB_CONFIG = {
  host: env('DB_HOST', '127.0.0.1'),
  port: Number(env('DB_PORT', '3306')),
  user: env('DB_USERNAME', 'payroll'),
  password: env('DB_PASSWORD', 'payroll'),
  database: env('DB_DATABASE', 'payroll_system'),
};

// Seeded by 0001-seed-admin-user.js — same defaults, overridable the same way
// the seeder itself is (ADMIN_EMAIL/ADMIN_PASSWORD).
export const ADMIN_CREDENTIALS = {
  email: env('ADMIN_EMAIL', 'admin@payroll-system.local'),
  password: env('ADMIN_PASSWORD', 'ChangeMe123!'),
};

// Not seeded anywhere — global setup creates this user once (idempotent: it
// checks GET /users first) via POST /users, since there is no HR-role seed
// account. Fixed credentials because /users has no DELETE, only
// deactivate/reactivate (§11-style — no hard delete path) — recreating a
// fresh random user every run would leak one row per run forever, so this
// user is meant to be long-lived across runs instead, the same way the admin
// seed account is.
export const HR_STAFF_CREDENTIALS = {
  name: 'E2E HR Staff',
  email: env('E2E_HR_EMAIL', 'e2e.hr.staff@payroll-system.local'),
  password: env('E2E_HR_PASSWORD', 'E2eHrStaff123!'),
};

// Every fixture row this suite creates is tagged with this prefix in its
// human-readable name/label column (employees, org masters, letters'
// violation/reason text, etc.) — the ONE marker both per-test afterEach
// cleanup and the global-teardown safety net key off of. NIKs use a
// numeric-only variant (see support/fixtures.ts's nik()) since that column
// isn't free text.
export const FIXTURE_TAG = 'E2E_TEST_FIXTURE';

// Reserved period prefix for every payroll run this suite creates — 2099 is
// far enough in the future to never collide with a real dev-DB payroll run,
// and lets global-teardown.ts's safety-net sweep find leftover runs by
// `period LIKE '2099-%'` alone (payroll_runs carries no free-text tag column
// to key off the way employees/org masters do via FIXTURE_TAG). Individual
// spec files each use a distinct month (e.g. '2099-01', '2099-02', ...) so
// they never contend over the same period's lock.
export const E2E_PERIOD_PREFIX = '2099-';
