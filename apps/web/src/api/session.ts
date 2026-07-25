import type { Role } from '@payroll-system/shared-types';

// B-04 (06_FRONTEND_GENERAL.md §13.5) — localStorage holds both the token and
// the full login-response user (there is no GET /auth/me to re-fetch it from,
// B-03). This is the one place those two keys are named — FE-T03's
// AuthProvider reads/writes through these functions, it does not touch
// localStorage directly, so the storage shape never has two definitions.
const ACCESS_TOKEN_KEY = 'payroll.accessToken';
const USER_KEY = 'payroll.user';
const SESSION_EXPIRED_KEY = 'payroll.sessionExpired';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    // Corrupt/foreign value — treat as no session rather than throwing.
    return null;
  }
}

export function setSession(accessToken: string, user: SessionUser): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Set right before the 401 redirect (client.ts) so /login (FE-T03) can show
// "sesi berakhir, silakan login kembali" once, then consume the flag.
export function markSessionExpired(): void {
  sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
}

export function consumeSessionExpiredFlag(): boolean {
  const wasExpired = sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1';
  sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  return wasExpired;
}
