import { AttendanceSource } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>. `source` decides
// overwrite precedence (§5.3/§11) — always shown, never hidden.
export const ATTENDANCE_SOURCE_LABELS: Record<AttendanceSource, StatusTagMeta> = {
  [AttendanceSource.FINGERPRINT]: { label: 'Sidik Jari', color: 'blue' },
  [AttendanceSource.MANUAL]: { label: 'Manual', color: 'purple' },
  [AttendanceSource.CSV_IMPORT]: { label: 'Impor CSV', color: 'default' },
};
