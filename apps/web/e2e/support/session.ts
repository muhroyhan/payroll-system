import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ApiContext } from './apiClient';

const AUTH_DIR = path.join(import.meta.dirname, '..', '.auth');
export const ADMIN_STORAGE_STATE = path.join(AUTH_DIR, 'admin-storage-state.json');
export const HR_STORAGE_STATE = path.join(AUTH_DIR, 'hr-storage-state.json');
const TOKENS_FILE = path.join(AUTH_DIR, 'tokens.json');

export interface SavedTokens {
  admin: { token: string; userId: string };
  hr: { token: string; userId: string };
}

export function saveTokens(tokens: SavedTokens): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

// The auth login endpoint is throttled to 5 req/min per IP
// (auth.controller.ts's @Throttle) — logging in fresh per test (or even per
// spec file) would blow through that within seconds once more than a
// handful of tests run. global-setup.ts logs in exactly twice for the whole
// suite (once per role) and every test reads the resulting token back from
// this file instead of calling /auth/login again.
function readTokens(): SavedTokens {
  try {
    return JSON.parse(readFileSync(TOKENS_FILE, 'utf-8')) as SavedTokens;
  } catch {
    throw new Error(
      'e2e/.auth/tokens.json not found — global-setup.ts must run before any test ' +
        '(this is wired via playwright.config.ts globalSetup; if you are invoking a ' +
        'test file directly, run `pnpm --filter web test:e2e` instead).',
    );
  }
}

export function adminApi(): ApiContext {
  const { admin } = readTokens();
  return new ApiContext(admin.token, admin.userId);
}

export function hrApi(): ApiContext {
  const { hr } = readTokens();
  return new ApiContext(hr.token, hr.userId);
}
