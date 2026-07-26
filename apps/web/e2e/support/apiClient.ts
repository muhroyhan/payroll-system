import { ADMIN_CREDENTIALS, API_BASE_URL } from './env';

// Thin wrapper over the real HTTP API (Node 22's built-in fetch — no axios
// dependency needed here) used to build/tear down fixture data directly,
// bypassing the UI for setup exactly as the task asks: tests exercise real
// screens, but fixtures are created/removed through the same API the app
// itself talks to, not mocked and not seeded permanently.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    method: string,
    path: string,
  ) {
    super(`${method} ${path} -> ${status}: ${JSON.stringify(body)}`);
  }
}

export interface AuthSession {
  accessToken: string;
  user: { id: string; name: string; email: string; role: string };
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await safeJson(res), 'POST', '/auth/login');
  }
  return (await res.json()) as AuthSession;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

/** A logged-in API context — every fixture builder takes one of these. */
export class ApiContext {
  constructor(
    public readonly token: string,
    public readonly userId: string,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new ApiError(res.status, await safeJson(res), method, path);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }
  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }
  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export async function loginAsAdmin(): Promise<ApiContext> {
  const session = await login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  return new ApiContext(session.accessToken, session.user.id);
}
