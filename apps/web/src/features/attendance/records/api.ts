import type { AttendanceSource } from '@payroll-system/shared-types';
import { apiClient } from '../../../api/client';

// Mirrors attendance-record.entity.ts. list() has NO include (verified
// against attendance-records.service.ts's plain findAll()) — employee names
// are looked up via useEmployeesQuery, not a second lookup implementation.
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  overtimeHours: string;
  isHoliday: boolean;
  isOnLeave: boolean;
  hasPermission: boolean;
  hasMissedClockOut: boolean;
  source: AttendanceSource;
  // Audit-trail follow-up (§D) — who authored the CURRENT data (enteredBy,
  // only when source is 'manual') and who performed the most recent
  // cross-source overwrite (overwrittenBy), if any. Full history is in
  // audit_events (AuditHistoryPanel), not just these latest-state fields.
  enteredBy: string | null;
  overwrittenBy: string | null;
}

// Mirrors CreateAttendanceRecordDto — `source` is never client-supplied, the
// service sets it per endpoint (manual entry here always yields 'manual').
export interface AttendanceRecordFormValues {
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  overtimeHours?: number;
  isHoliday?: boolean;
  isOnLeave?: boolean;
  hasPermission?: boolean;
}

// R-08 — the caller (AttendanceRecordsPage.tsx) always supplies a
// single-month from/to; there is no unfiltered fetch path.
export async function listAttendanceRecords(
  employeeId: string | undefined,
  from: string,
  to: string,
): Promise<AttendanceRecord[]> {
  const { data } = await apiClient.get<AttendanceRecord[]>('/attendance-records', {
    params: { employeeId, from, to },
  });
  return data;
}

// §11/TC-ATT-07 — `overwrite` is a QUERY param on this endpoint specifically
// (attendance-records.controller.ts's create()), unlike reconcile's, which
// takes it in the body. Getting this wrong would silently always upsert
// without ever raising the "already exists from source X" 409.
export async function createAttendanceRecord(
  input: AttendanceRecordFormValues,
  overwrite: boolean,
): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<AttendanceRecord>('/attendance-records', input, {
    params: { overwrite },
  });
  return data;
}

export interface ReconcileRangeInput {
  employeeId: string;
  from: string;
  to: string;
  overwrite?: boolean;
}

// Runs the raw-log → attendance_records reconciliation (source = fingerprint)
// for the whole range in one request. NOT partial-success: a single day's
// source conflict throws and aborts the entire range (verified against
// attendance-reconciliation.service.ts's reconcileRange, which has no
// per-day try/catch) — the confirm-then-retry-with-overwrite flow
// (AttendanceRecordsPage.tsx) applies to the whole range, not per day.
export async function reconcileAttendance(
  input: ReconcileRangeInput,
): Promise<AttendanceRecord[]> {
  const { data } = await apiClient.post<AttendanceRecord[]>(
    '/attendance-records/reconcile',
    input,
  );
  return data;
}
