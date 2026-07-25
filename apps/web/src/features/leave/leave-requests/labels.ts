import { LeaveRequestStatus } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>.
export const LEAVE_REQUEST_STATUS_LABELS: Record<LeaveRequestStatus, StatusTagMeta> = {
  [LeaveRequestStatus.PENDING]: { label: 'Menunggu Persetujuan', color: 'gold' },
  [LeaveRequestStatus.APPROVED]: { label: 'Disetujui', color: 'green' },
  [LeaveRequestStatus.REJECTED]: { label: 'Ditolak', color: 'red' },
};
