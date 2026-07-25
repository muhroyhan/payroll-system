import { KasbonStatus } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>.
export const KASBON_STATUS_LABELS: Record<KasbonStatus, StatusTagMeta> = {
  [KasbonStatus.PENDING]: { label: 'Menunggu Persetujuan', color: 'gold' },
  [KasbonStatus.APPROVED]: { label: 'Disetujui', color: 'blue' },
  [KasbonStatus.REJECTED]: { label: 'Ditolak', color: 'red' },
  [KasbonStatus.PAID_OFF]: { label: 'Lunas', color: 'green' },
};
