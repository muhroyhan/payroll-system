import { HolidaySource } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>.
export const HOLIDAY_SOURCE_LABELS: Record<HolidaySource, StatusTagMeta> = {
  [HolidaySource.GOOGLE_CALENDAR]: { label: 'Google Calendar', color: 'blue' },
  [HolidaySource.MANUAL]: { label: 'Manual', color: 'default' },
};
