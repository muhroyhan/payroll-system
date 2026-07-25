import { ScopeType, SCOPE_TYPE_PRIORITY } from '@payroll-system/shared-types';

// R-05 (07_FRONTEND_RULES.md) — label-only map, imported from shared-types.
export const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  [ScopeType.EMPLOYEE]: 'Karyawan',
  [ScopeType.DIVISION]: 'Divisi',
  [ScopeType.DEPARTMENT]: 'Departemen',
  [ScopeType.POSITION]: 'Posisi',
  [ScopeType.EMPLOYEE_TYPE]: 'Jenis Karyawan',
};

// §5.2/R-13 — SCOPE_TYPE_PRIORITY (shared-types) orders these options only
// (most-specific first, matching the resolver's own priority). It does NOT
// mean the frontend picks a winner — only GET …/resolve does that.
export const SCOPE_TYPE_OPTIONS = SCOPE_TYPE_PRIORITY.map((type) => ({
  value: type,
  label: SCOPE_TYPE_LABELS[type],
}));
