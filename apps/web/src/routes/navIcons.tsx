import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Clock,
  FileCheck,
  FileClock,
  FileSignature,
  FileText,
  Fingerprint,
  Gift,
  HandCoins,
  LayoutDashboard,
  Percent,
  PiggyBank,
  Receipt,
  Tags,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { NavGroupKey } from './access';

// BUGS#11 — one icon per Sider leaf item, keyed by AccessEntry.path (kept
// separate from access.ts, which stays a plain data module with no
// React/JSX so it's safe to import from non-component code).
export const NAV_ICONS: Record<string, LucideIcon> = {
  '/': LayoutDashboard,
  '/employees': Users,
  '/organization': Building2,
  '/masters/salary': Wallet,
  '/masters/incentive': Gift,
  '/masters/temp-components': FileClock,
  '/masters/holidays': CalendarDays,
  '/masters/payslip-components': Receipt,
  '/attendance/fingerprints': Fingerprint,
  '/attendance/raw-logs': FileText,
  '/attendance/records': ClipboardList,
  '/leave/types': Tags,
  '/leave/policy': FileCheck,
  '/leave/balances': PiggyBank,
  '/leave/requests': CalendarClock,
  '/letters/surat-ijin': FileSignature,
  '/letters/surat-peringatan': AlertTriangle,
  '/letters/overtime': Clock,
  '/kasbon': HandCoins,
  '/payroll-runs': Banknote,
  '/settings/tax-constants': Percent,
  '/settings/salary-period': CalendarRange,
  '/settings/users': UserCog,
};

// Group headers (BUGS#12's collapsible submenus) get an icon too — antd
// SubMenu (unlike a plain group label) supports one.
export const NAV_GROUP_ICONS: Record<NavGroupKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  employees: Users,
  masters: Wallet,
  attendance: ClipboardList,
  leave: CalendarClock,
  letters: FileSignature,
  kasbon: HandCoins,
  payroll: Banknote,
  settings: UserCog,
};
