import { chromium } from '@playwright/test';
import { ApiContext, login } from './support/apiClient';
import { ensureHrStaffTestUser } from './support/fixtures';
import { ADMIN_CREDENTIALS, API_BASE_URL, HR_STAFF_CREDENTIALS, WEB_BASE_URL } from './support/env';
import { ADMIN_STORAGE_STATE, HR_STORAGE_STATE, saveTokens } from './support/session';

async function waitFor(url: string, label: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = new Error(`${label} responded ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `${label} at ${url} did not become ready within ${timeoutMs}ms — this suite needs Docker ` +
      `(MySQL+Redis), the API (\`pnpm dev:api\`), and the web dev server (\`pnpm dev:web\`) already ` +
      `running. Last error: ${String(lastError)}`,
  );
}

/**
 * Runs once for the whole suite (not per worker, not per file). Does two
 * things every spec relies on:
 *   1. Confirms the real stack (API + web dev server, which in turn need
 *      Docker MySQL/Redis) is actually up, with a clear error if not —
 *      rather than every test failing individually with a cryptic
 *      connection-refused.
 *   2. Logs in as admin and the (idempotently-created) HR test user exactly
 *      ONCE each, since /auth/login is throttled to 5/min — see
 *      support/session.ts. Both the raw tokens (for API-based fixture
 *      setup) and browser storageState snapshots (for UI tests that need to
 *      already be logged in, so they don't re-exercise /login every time)
 *      are persisted to e2e/.auth/.
 */
export default async function globalSetup(): Promise<void> {
  await waitFor(`${API_BASE_URL}/`, 'API');
  await waitFor(WEB_BASE_URL, 'Web dev server');

  const adminSession = await login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  const adminApi = new ApiContext(adminSession.accessToken, adminSession.user.id);

  await ensureHrStaffTestUser(adminApi);
  const hrSession = await login(HR_STAFF_CREDENTIALS.email, HR_STAFF_CREDENTIALS.password);

  saveTokens({
    admin: { token: adminSession.accessToken, userId: adminSession.user.id },
    hr: { token: hrSession.accessToken, userId: hrSession.user.id },
  });

  const browser = await chromium.launch();
  await saveStorageState(adminSession, ADMIN_STORAGE_STATE);
  await saveStorageState(hrSession, HR_STORAGE_STATE);
  await browser.close();

  async function saveStorageState(
    session: { accessToken: string; user: unknown },
    filePath: string,
  ): Promise<void> {
    const context = await browser.newContext({ baseURL: WEB_BASE_URL });
    const page = await context.newPage();
    // Must set localStorage from a page on the same origin (localStorage is
    // origin-scoped) — session.ts (apps/web/src/api/session.ts) is the one
    // place these two key names are defined, mirrored here deliberately
    // since e2e can't import frontend source across the Vite/Node boundary.
    await page.goto('/login');
    // Wait for the page to genuinely settle before touching localStorage —
    // on a cold Vite dev server the first request can trigger a dependency
    // re-optimization + full-page reload mid-navigation, which tears down
    // the execution context page.evaluate would otherwise run in.
    await page.getByLabel('Email').waitFor();
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('payroll.accessToken', token);
        localStorage.setItem('payroll.user', JSON.stringify(user));
      },
      { token: session.accessToken, user: session.user },
    );
    await context.storageState({ path: filePath });
    await context.close();
  }
}
