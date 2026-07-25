import type { ScanType } from '@payroll-system/shared-types';
import { apiClient } from '../../../api/client';
import type { BulkImportResult } from '../../../api/bulkImport';

// Mirrors attendance-raw-log.entity.ts. `scanType` is genuinely nullable —
// many devices don't report in/out per scan; reconciliation infers it from
// scan order per day (§5.3). Render null as "—" with an explanation, never
// as an error (see RawLogsPage.tsx).
export interface AttendanceRawLog {
  id: string;
  deviceUserId: string;
  deviceId: string;
  scanTime: string;
  scanType: ScanType | null;
}

export interface AttendanceRawLogFormValues {
  deviceUserId: string;
  deviceId: string;
  scanTime: string;
  scanType?: ScanType;
}

// R-08 (07_FRONTEND_RULES.md) — this table grows ~2 rows/employee/working
// day; the caller (RawLogsPage.tsx) only enables this query once at least
// one filter is set, it is never fetched unfiltered.
export async function listAttendanceRawLogs(
  deviceUserId?: string,
  deviceId?: string,
): Promise<AttendanceRawLog[]> {
  const { data } = await apiClient.get<AttendanceRawLog[]>('/attendance-raw-logs', {
    params: { deviceUserId, deviceId },
  });
  return data;
}

export async function createAttendanceRawLog(
  input: AttendanceRawLogFormValues,
): Promise<AttendanceRawLog> {
  const { data } = await apiClient.post<AttendanceRawLog>('/attendance-raw-logs', input);
  return data;
}

export async function removeAttendanceRawLog(id: string): Promise<void> {
  await apiClient.delete(`/attendance-raw-logs/${id}`);
}

export async function importAttendanceRawLogs(file: File): Promise<BulkImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<BulkImportResult>(
    '/attendance-raw-logs/import',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}
