import { PayrollRunStatus } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>. Pulled forward
// with the rest of features/payroll-runs (see api.ts); FE-T26 reuses this.
export const PAYROLL_RUN_STATUS_LABELS: Record<PayrollRunStatus, StatusTagMeta> = {
  [PayrollRunStatus.DRAFT]: { label: 'Draft', color: 'default' },
  [PayrollRunStatus.CALCULATED]: { label: 'Terhitung', color: 'blue' },
  [PayrollRunStatus.APPROVED]: { label: 'Disetujui', color: 'gold' },
  [PayrollRunStatus.DISBURSED]: { label: 'Dicairkan', color: 'green' },
};
