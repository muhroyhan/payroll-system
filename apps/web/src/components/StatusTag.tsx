import { Tag } from 'antd';

export interface StatusTagMeta {
  label: string;
  color: string;
}

interface StatusTagProps<E extends string> {
  value: E;
  /** Must be an exhaustive Record<Enum, …> — see R-05 below. */
  labels: Record<E, StatusTagMeta>;
}

// R-05 (07_FRONTEND_RULES.md) — this component is enum-agnostic on purpose;
// no status/type value is hardcoded here. The exhaustiveness guarantee comes
// from the CALLER's map: a feature module defines
// `const KASBON_STATUS_LABELS: Record<KasbonStatus, StatusTagMeta> = {...}`
// (imported from @payroll-system/shared-types, one file per enum per R-05),
// and TypeScript refuses to compile that map if a backend enum member is
// missing — so adding a new status becomes a compile error, not a blank Tag.
export function StatusTag<E extends string>({ value, labels }: StatusTagProps<E>) {
  const meta = labels[value];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}
