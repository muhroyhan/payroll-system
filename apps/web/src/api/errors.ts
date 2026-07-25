import axios from 'axios';

// R-04 (07_FRONTEND_RULES.md) — the ONE error-mapping contract for the whole
// app. Every screen renders from describeApiError(); nothing renders
// error.message / error.response.data.message / a raw axios error directly
// (R-04 prohibition). This is the most reused module in the frontend — the
// shape below is locked to the R-04 table and should not drift screen by
// screen.

export type ApiErrorKind =
  | 'auth'
  | 'forbidden'
  | 'notfound'
  | 'validation'
  | 'conflict'
  | 'network'
  | 'unknown';

export type ApiErrorSurface = 'toast' | 'inline' | 'modal' | 'redirect';

// Non-field validation messages (whitelist rejections, messages that don't
// parse as "<property> <constraint>") live under this key instead of being
// dropped — read it for a form-level Alert; toAntdFormFields() excludes it.
export const FORM_ERROR_KEY = '_form';

export interface ApiErrorPresentation {
  kind: ApiErrorKind;
  title: string;
  detail?: string;
  fieldErrors?: Record<string, string[]>;
  surface: ApiErrorSurface;
}

// Strips the developer-facing spec references the backend's ConflictException
// messages carry (they're written for whoever reads the code, not for HR
// staff) — see 07_FRONTEND_RULES.md R-04. Order matters: parenthesized forms
// first, so a lone trailing "()" isn't left behind by the standalone pass.
function stripSpecReferences(message: string): string {
  return message
    .replace(/\(§[\d.]+\)/g, '')
    .replace(/§[\d.]+/g, '')
    .replace(/\(TC-[A-Z0-9-]+\)/g, '')
    .replace(/TC-[A-Z0-9-]+/g, '')
    .replace(/\(P\d+-T\d+[a-z]?\)/g, '')
    .replace(/P\d+-T\d+[a-z]?/gi, '')
    .replace(/\s+([;,.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractServerMessage(data: unknown): string | string[] | undefined {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((m) => typeof m === 'string')) {
      return message as string[];
    }
  }
  return undefined;
}

// class-validator's built-in decorators produce "<property> <constraint>"
// (e.g. "dependentCount must not be greater than 3"), so the first token is
// usually the DTO field name antd Form.Item is registered under. A message
// that doesn't parse that way (or is the ValidationPipe's
// forbidNonWhitelisted rejection, "property X should not exist" — a
// frontend/backend DTO mismatch, not user error) goes into FORM_ERROR_KEY
// instead of being guessed at.
function parseValidationMessages(messages: string[]): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  const push = (key: string, message: string) => {
    (fieldErrors[key] ??= []).push(message);
  };

  for (const raw of messages) {
    const forbiddenPropertyMatch = raw.match(/^property (\S+) should not exist$/);
    if (forbiddenPropertyMatch) {
      if (import.meta.env.DEV) {
        console.error(
          `[api/errors] DTO drift: the server rejected a field the client sent — ${raw}`,
        );
      }
      push(FORM_ERROR_KEY, raw);
      continue;
    }

    const fieldMatch = raw.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+\S.*$/);
    if (fieldMatch) {
      push(fieldMatch[1], raw);
    } else {
      push(FORM_ERROR_KEY, raw);
    }
  }

  return fieldErrors;
}

// Converts describeApiError()'s fieldErrors into the shape antd's
// `form.setFields()` expects, excluding the FORM_ERROR_KEY bucket (that one
// renders as a form-level Alert, not a per-field error).
export function toAntdFormFields(
  fieldErrors: Record<string, string[]> | undefined,
): Array<{ name: string; errors: string[] }> {
  if (!fieldErrors) return [];
  return Object.entries(fieldErrors)
    .filter(([name]) => name !== FORM_ERROR_KEY)
    .map(([name, errors]) => ({ name, errors }));
}

export function describeApiError(error: unknown): ApiErrorPresentation {
  if (!axios.isAxiosError(error)) {
    return {
      kind: 'unknown',
      title: 'Terjadi kesalahan tak terduga.',
      surface: 'toast',
    };
  }

  if (!error.response) {
    // No response at all — network failure, timeout, CORS rejection, DNS.
    return {
      kind: 'network',
      title: 'Gagal menghubungi server. Periksa koneksi Anda dan coba lagi.',
      surface: 'toast',
    };
  }

  const { status, data } = error.response;
  const serverMessage = extractServerMessage(data);

  switch (status) {
    case 401:
      // No refresh endpoint exists (B-03, 06_FRONTEND_GENERAL.md §13.5) —
      // the interceptor in client.ts redirects immediately, it never retries.
      return {
        kind: 'auth',
        title: 'Sesi berakhir, silakan login kembali.',
        surface: 'redirect',
      };

    case 403:
      // RolesGuard failure — the session is fine, the role is wrong. Never
      // logs the user out (R-04).
      return {
        kind: 'forbidden',
        title: 'Anda tidak punya akses untuk melakukan tindakan ini.',
        surface: 'inline',
      };

    case 404:
      return {
        kind: 'notfound',
        title: 'Data tidak ditemukan.',
        detail: typeof serverMessage === 'string' ? serverMessage : undefined,
        surface: 'inline',
      };

    case 400: {
      const messages = Array.isArray(serverMessage)
        ? serverMessage
        : typeof serverMessage === 'string'
          ? [serverMessage]
          : [];
      const fieldErrors = parseValidationMessages(messages);
      const formErrors = fieldErrors[FORM_ERROR_KEY];
      return {
        kind: 'validation',
        title: 'Data yang dikirim tidak valid.',
        detail: formErrors?.join(' '),
        fieldErrors,
        surface: 'inline',
      };
    }

    case 409: {
      // Conflict messages are deliberately explanatory (§11 locks,
      // state-machine violations, uniqueness) and already tell the user the
      // correct alternative — show them, minus the developer-facing spec
      // tokens. Default surface is 'modal' (a blocking, dismiss-to-continue
      // explanation); a screen embedding this in a form may render it as a
      // persistent inline Alert instead using the same `title`/`detail`.
      const raw = typeof serverMessage === 'string' ? serverMessage : undefined;
      const cleaned = raw ? stripSpecReferences(raw) : undefined;
      return {
        kind: 'conflict',
        title: cleaned || 'Tindakan ini tidak dapat dilakukan saat ini.',
        detail: raw && cleaned !== raw ? raw : undefined,
        surface: 'modal',
      };
    }

    default:
      if (status >= 500) {
        return {
          kind: 'network',
          title: 'Terjadi masalah pada server. Coba lagi beberapa saat lagi.',
          detail: typeof serverMessage === 'string' ? serverMessage : undefined,
          surface: 'toast',
        };
      }
      return {
        kind: 'unknown',
        title: 'Terjadi kesalahan tak terduga.',
        detail: typeof serverMessage === 'string' ? serverMessage : undefined,
        surface: 'toast',
      };
  }
}
