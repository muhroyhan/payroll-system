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

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// Audit history (features/audit-events) — the only current consumer that
// needs time-of-day, not just the date.
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return dateTimeFormatter.format(date);
}
