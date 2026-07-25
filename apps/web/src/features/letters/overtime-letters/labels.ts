import { OvertimeLetterStatus } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>.
export const OVERTIME_LETTER_STATUS_LABELS: Record<OvertimeLetterStatus, StatusTagMeta> = {
  [OvertimeLetterStatus.PENDING]: { label: 'Menunggu Verifikasi', color: 'gold' },
  [OvertimeLetterStatus.VERIFIED]: { label: 'Terverifikasi', color: 'green' },
  [OvertimeLetterStatus.REJECTED]: { label: 'Ditolak', color: 'red' },
};
