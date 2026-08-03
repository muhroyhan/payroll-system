// FE-T05 (09_FRONTEND_STEPS.md) — format-only helpers. R-07
// (07_FRONTEND_RULES.md): the frontend never derives a money figure, only
// formats one the API already returned. Neither function here sums,
// multiplies, or otherwise computes a value — callers must not use them to
// paper over a client-side calculation.

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatIDR(amount: number): string {
  return idrFormatter.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return dateFormatter.format(date);
}

// BUGS#18 — Intl.DateTimeFormat('id-ID', ...) renders time with a "."
// separator (its actual locale convention, e.g. "19.00"), not the "19:00"
// every screen here is supposed to show. Built manually instead of coaxing
// Intl into it, so the separator can never regress back to a locale default
// no matter which options get added later. The one time-of-day formatter —
// every screen composes this (or formatDateTime below) instead of a local
// toLocaleTimeString call.
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Audit history (features/audit-events) — the only current consumer that
// needs time-of-day, not just the date.
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${formatDate(date)} ${formatTime(date)}`;
}
