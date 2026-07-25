import { ScanType } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>. `scanType` on
// the record itself is nullable (many devices don't report it) — that null
// case is handled separately in RawLogsPage.tsx, not folded into this map.
export const SCAN_TYPE_LABELS: Record<ScanType, StatusTagMeta> = {
  [ScanType.IN]: { label: 'Masuk', color: 'blue' },
  [ScanType.OUT]: { label: 'Keluar', color: 'default' },
};
