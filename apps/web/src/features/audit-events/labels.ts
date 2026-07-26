import { AuditAction } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>.
export const AUDIT_ACTION_LABELS: Record<AuditAction, StatusTagMeta> = {
  [AuditAction.CREATE]: { label: 'Dibuat', color: 'green' },
  [AuditAction.UPDATE]: { label: 'Diubah', color: 'blue' },
  [AuditAction.DELETE]: { label: 'Dihapus', color: 'red' },
};
