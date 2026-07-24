// P7-T08 (R4) — derive the "no NPWP on file → 20% surcharge" flag from an
// employee's stored NPWP. §5.1: the field is `employees.npwp`, a nullable
// STRING (the tax ID, or null when the employee has none). There is no
// separate boolean — "missing" is derived from this one field, never
// hardcoded per employee.
//
// Missing = null/undefined OR blank/whitespace-only. Any non-empty NPWP value
// means the employee is on file, so no surcharge.
export function isNpwpMissing(npwp: string | null | undefined): boolean {
  return npwp == null || npwp.trim() === '';
}
