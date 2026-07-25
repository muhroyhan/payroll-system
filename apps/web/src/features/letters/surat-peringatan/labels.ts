import { SPLevel } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>.
export const SP_LEVEL_LABELS: Record<SPLevel, StatusTagMeta> = {
  [SPLevel.SP1]: { label: 'SP1', color: 'gold' },
  [SPLevel.SP2]: { label: 'SP2', color: 'orange' },
  [SPLevel.SP3]: { label: 'SP3', color: 'red' },
};
