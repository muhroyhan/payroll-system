import { defineConfig, devices } from '@playwright/test';
import { WEB_BASE_URL } from './e2e/support/env';

// FE E2E regression suite — replaces the ad-hoc manual-Puppeteer-in-browser
// verification pattern used throughout FE-T17/T26-31/T33/T34 (09_FRONTEND_STEPS.md)
// with an automated suite that runs against the real stack: Docker MySQL +
// Redis, the real NestJS API, the real Vite dev server — no mocked network
// layer, consistent with how every one of those manual passes was actually
// done. See apps/web/README.md's "E2E tests" section for prerequisites and
// how to run it.
//
// No `webServer` entry here on purpose: this suite assumes Docker + API +
// web are already running (global-setup.ts fails fast with a clear message
// if they aren't) rather than trying to own their lifecycle itself.
export default defineConfig({
  testDir: './e2e/specs',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // Serial by design, not a default left untouched: every spec drives real
  // money-adjacent state (payroll runs, kasbon deductions) through the real
  // API, and POST /auth/login itself is throttled to 5/min — this suite
  // avoids that entirely by logging in once in global-setup and reusing the
  // token (support/session.ts), but keeping workers at 1 also keeps BullMQ
  // job processing order predictable across specs while this suite is new.
  workers: 1,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: WEB_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
