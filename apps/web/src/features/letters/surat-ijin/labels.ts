import { SuratIjinStatus, SuratIjinType } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>.
export const SURAT_IJIN_TYPE_LABELS: Record<SuratIjinType, StatusTagMeta> = {
  [SuratIjinType.LATE_ARRIVAL]: { label: 'Terlambat Masuk', color: 'gold' },
  [SuratIjinType.EARLY_LEAVE]: { label: 'Pulang Awal', color: 'purple' },
};

export const SURAT_IJIN_STATUS_LABELS: Record<SuratIjinStatus, StatusTagMeta> = {
  [SuratIjinStatus.PENDING]: { label: 'Menunggu Persetujuan', color: 'gold' },
  [SuratIjinStatus.APPROVED]: { label: 'Disetujui', color: 'green' },
  [SuratIjinStatus.REJECTED]: { label: 'Ditolak', color: 'red' },
};
