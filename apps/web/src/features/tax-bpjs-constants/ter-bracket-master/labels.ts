import { TerCategory } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>.
export const TER_CATEGORY_LABELS: Record<TerCategory, StatusTagMeta> = {
  [TerCategory.A]: { label: 'Kategori A', color: 'blue' },
  [TerCategory.B]: { label: 'Kategori B', color: 'purple' },
  [TerCategory.C]: { label: 'Kategori C', color: 'volcano' },
};
