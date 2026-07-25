import type { HolidaySource } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';

// Mirrors apps/api/src/modules/holidays/entities/holiday.entity.ts.
export interface Holiday {
  id: string;
  date: string;
  name: string;
  source: HolidaySource;
  isActive: boolean;
}

// Mirrors CreateHolidayDto — `source` is never accepted from the client
// (the service always sets it to 'manual' on create; sync is the only path
// that produces 'google_calendar' rows).
export interface HolidayFormValues {
  date: string;
  name: string;
  isActive?: boolean;
}

// Mirrors HolidaySyncResult (holiday-sync.service.ts).
export interface HolidaySyncResult {
  fetched: number;
  created: number;
  updated: number;
  skippedManual: number;
}

export async function listHolidays(from?: string, to?: string): Promise<Holiday[]> {
  const { data } = await apiClient.get<Holiday[]>('/holidays', { params: { from, to } });
  return data;
}

export async function createHoliday(input: HolidayFormValues): Promise<Holiday> {
  const { data } = await apiClient.post<Holiday>('/holidays', input);
  return data;
}

export async function updateHoliday(
  id: string,
  input: Partial<HolidayFormValues>,
): Promise<Holiday> {
  const { data } = await apiClient.put<Holiday>(`/holidays/${id}`, input);
  return data;
}

export async function removeHoliday(id: string): Promise<void> {
  await apiClient.delete(`/holidays/${id}`);
}

// Admin-only on the backend (§15.7) — the UI still calls the same endpoint
// for every role; the LockedAction in HolidaysPage.tsx is what actually
// prevents HR staff from triggering it (R-11).
export async function syncHolidays(year?: number): Promise<HolidaySyncResult> {
  const { data } = await apiClient.post<HolidaySyncResult>('/holidays/sync', null, {
    params: { year },
  });
  return data;
}
