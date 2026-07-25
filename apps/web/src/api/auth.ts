import { apiClient } from './client';
import type { SessionUser } from './session';

export interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}

// §13.4 (06_FRONTEND_GENERAL.md) — the only auth endpoint that exists. No
// refresh, no /auth/me (B-03) — this response is the one and only place the
// frontend ever learns who the user is.
export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  return data;
}
