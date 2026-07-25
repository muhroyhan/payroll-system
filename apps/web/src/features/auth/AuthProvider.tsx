import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Role } from '@payroll-system/shared-types';
import { loginRequest } from '../../api/auth';
import {
  clearSession,
  getStoredUser,
  getToken,
  setSession,
  type SessionUser,
} from '../../api/session';
import { AuthContext, type AuthContextValue } from './AuthContext';

// B-03 (06_FRONTEND_GENERAL.md §13.5) — decided: accept the 8h hard session,
// no /auth/me. There is nothing to re-validate a token against, so "restore
// on reload" means exactly this — read back what login() itself stored, and
// trust it until the API returns 401. A token that outlived its 8h validity
// still loads a user here; the first authenticated request then 401s and
// client.ts's interceptor clears it.
function restoreSession(): SessionUser | null {
  const token = getToken();
  const user = getStoredUser();
  return token && user ? user : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(restoreSession);

  // R-01 (07_FRONTEND_RULES.md) — server state goes through React Query,
  // hence the mutation for the actual network call. But its *result* (who is
  // logged in) has nowhere to live as a query cache entry: there is no
  // GET /auth/me to invalidate/refetch (B-03), so "current user" is
  // necessarily plain context state, mirrored into localStorage so it
  // survives a reload. This is the one deliberate exception the rule
  // anticipates, not a workaround.
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginRequest(email, password),
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken, user: loggedInUser } =
        await loginMutation.mutateAsync({ email, password });
      setSession(accessToken, loggedInUser);
      setUser(loggedInUser);
    },
    [loginMutation],
  );

  // Client-side only — there is no server-side revocation endpoint, so a
  // discarded token stays technically valid until it expires (§13.4).
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAdmin: user?.role === Role.ADMIN, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
