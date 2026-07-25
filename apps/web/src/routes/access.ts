import { Role } from '@payroll-system/shared-types';

export type NavGroupKey =
  | 'dashboard'
  | 'employees'
  | 'masters'
  | 'attendance'
  | 'leave'
  | 'letters'
  | 'kasbon'
  | 'payroll'
  | 'settings';

export interface AccessEntry {
  /** Section-root path (e.g. "/employees") — subroutes inherit via prefix match, see requiredRolesFor(). */
  path: string;
  label: string;
  group: NavGroupKey;
  /** Roles allowed to view this route AT ALL. Action-level splits inside an
   *  otherwise-shared route (e.g. payroll run lifecycle buttons, §15.12) are
   *  NOT modeled here — those stay in-screen against useAuth().isAdmin,
   *  because the route itself is legitimately open to both roles. */
  roles: readonly Role[];
}

export const NAV_GROUP_ORDER: readonly NavGroupKey[] = [
  'dashboard',
  'employees',
  'masters',
  'attendance',
  'leave',
  'letters',
  'kasbon',
  'payroll',
  'settings',
];

export const NAV_GROUP_LABELS: Record<NavGroupKey, string> = {
  dashboard: 'Beranda',
  employees: 'Karyawan',
  masters: 'Master',
  attendance: 'Absensi',
  leave: 'Cuti',
  letters: 'Surat',
  kasbon: 'Kasbon',
  payroll: 'Payroll',
  settings: 'Pengaturan',
};

const BOTH: readonly Role[] = [Role.ADMIN, Role.HR_STAFF];
const ADMIN_ONLY: readonly Role[] = [Role.ADMIN];

// FE-T04 (09_FRONTEND_STEPS.md), §15.1 + §15.15 (08_FRONTEND_STRUCTURE.md) —
// the ONE map feeding both Sider nav filtering and the route guard (R-11,
// 07_FRONTEND_RULES.md: hiding a nav item is presentation only, the route
// itself must still enforce it — both must read the same source or they
// will eventually drift).
//
// Not every path below has a page built yet (FE-T06 onward add them one at a
// time) — this list is populated in full now because the role assignment is
// already fully specified in the backend guards (§15.1) and writing it once
// avoids re-deriving it, and re-risking drift, per feature task. A nav entry
// whose page isn't built yet simply has no matching <Route> in router.tsx,
// so it resolves to the "*" NotFoundPage until its task lands — an honest
// state, not a bug.
export const ACCESS_ENTRIES: readonly AccessEntry[] = [
  { path: '/', label: 'Dashboard', group: 'dashboard', roles: BOTH },
  { path: '/employees', label: 'Karyawan', group: 'employees', roles: BOTH },
  { path: '/organization', label: 'Organisasi', group: 'employees', roles: BOTH },
  { path: '/masters/salary', label: 'Master Gaji', group: 'masters', roles: BOTH },
  { path: '/masters/incentive', label: 'Master Insentif', group: 'masters', roles: BOTH },
  { path: '/masters/temp-components', label: 'Komponen Sementara', group: 'masters', roles: BOTH },
  { path: '/masters/holidays', label: 'Hari Libur', group: 'masters', roles: BOTH },
  // Admin-only route, §15.6 — HR staff never see this nav item (§15.15).
  { path: '/masters/payslip-components', label: 'Komponen Payslip', group: 'masters', roles: ADMIN_ONLY },
  { path: '/attendance/fingerprints', label: 'Sidik Jari', group: 'attendance', roles: BOTH },
  { path: '/attendance/raw-logs', label: 'Log Absensi Mentah', group: 'attendance', roles: BOTH },
  { path: '/attendance/records', label: 'Rekap Absensi', group: 'attendance', roles: BOTH },
  { path: '/leave/types', label: 'Jenis Cuti', group: 'leave', roles: BOTH },
  { path: '/leave/policy', label: 'Kebijakan Cuti', group: 'leave', roles: BOTH },
  { path: '/leave/balances', label: 'Saldo Cuti', group: 'leave', roles: BOTH },
  { path: '/leave/requests', label: 'Pengajuan Cuti', group: 'leave', roles: BOTH },
  { path: '/letters/surat-ijin', label: 'Surat Ijin', group: 'letters', roles: BOTH },
  { path: '/letters/surat-peringatan', label: 'Surat Peringatan', group: 'letters', roles: BOTH },
  { path: '/letters/overtime', label: 'Surat Lembur', group: 'letters', roles: BOTH },
  { path: '/kasbon', label: 'Kasbon', group: 'kasbon', roles: BOTH },
  // Both roles see the list/detail/summary; the four lifecycle actions
  // (calculate/approve/disburse/revert) are admin-only IN-SCREEN (§15.12).
  { path: '/payroll-runs', label: 'Payroll Run', group: 'payroll', roles: BOTH },
  { path: '/payslips', label: 'Slip Gaji', group: 'payroll', roles: BOTH },
  // Admin-only routes, §15.14 — hidden from HR in the Sider (§15.15).
  { path: '/settings/tax-constants', label: 'Konstanta Pajak & BPJS', group: 'settings', roles: ADMIN_ONLY },
  // GET has no @Roles at all (any authenticated user); PUT is admin-only.
  // The route itself stays open to both — the write action is gated
  // in-screen, same pattern as payroll-runs above (§13.4/§15.14).
  { path: '/settings/salary-period', label: 'Periode Gaji', group: 'settings', roles: BOTH },
  { path: '/settings/users', label: 'Pengguna', group: 'settings', roles: ADMIN_ONLY },
];

/**
 * Longest-prefix match: a subroute not explicitly listed (e.g.
 * "/employees/123/edit") inherits its section root's roles ("/employees")
 * without needing its own entry — this is what lets ACCESS_ENTRIES stay at
 * one row per section instead of one row per screen.
 *
 * Returns undefined for a path with no match at all — callers treat that as
 * "any authenticated user", since every currently-unmatched path either has
 * no route registered yet (falls through to the "*" NotFoundPage, never
 * reaches a guard) or is a public route (/login, /403) that isn't guarded
 * in the first place.
 */
export function requiredRolesFor(pathname: string): readonly Role[] | undefined {
  let best: AccessEntry | undefined;
  for (const entry of ACCESS_ENTRIES) {
    const isMatch =
      entry.path === '/'
        ? pathname === '/'
        : pathname === entry.path || pathname.startsWith(`${entry.path}/`);
    if (isMatch && (!best || entry.path.length > best.path.length)) {
      best = entry;
    }
  }
  return best?.roles;
}

export function navEntriesForRole(role: Role): readonly AccessEntry[] {
  return ACCESS_ENTRIES.filter((entry) => entry.roles.includes(role));
}
