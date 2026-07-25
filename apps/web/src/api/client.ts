import axios, { type InternalAxiosRequestConfig } from 'axios';
import { describeApiError } from './errors';
import { clearSession, getToken, markSessionExpired } from './session';

// FE-T01/FE-T02 (09_FRONTEND_STEPS.md) — one shared axios instance; R-08
// (07_FRONTEND_RULES.md) forbids calling axios/fetch directly from a
// component or page. Every api/<module>.ts function goes through this.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});

// §13.4 (06_FRONTEND_GENERAL.md) — every endpoint except POST /auth/login
// requires a Bearer token; attach it here so no api/<module>.ts function has
// to know about auth.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// R-04 (07_FRONTEND_RULES.md) — the interceptor's only job is the one
// side-effect that must happen globally regardless of which screen made the
// call: on a real session-expiry 401, clear the session and redirect (no
// refresh endpoint exists, B-03, so there is nothing to retry). Every other
// status is left for the caller to interpret via describeApiError() at the
// point it's rendered — the interceptor does not transform or swallow the
// rejection.
//
// Keyed on `surface === 'redirect'`, not `kind === 'auth'`: describeApiError
// maps a POST /auth/login 401 (wrong credentials — no session to expire) to
// kind:'auth' but surface:'inline', so it's excluded here automatically
// without a second "is this the login request" check in two places.
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const presentation = describeApiError(error);
    if (
      presentation.surface === 'redirect' &&
      window.location.pathname !== '/login'
    ) {
      clearSession();
      markSessionExpired();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);
