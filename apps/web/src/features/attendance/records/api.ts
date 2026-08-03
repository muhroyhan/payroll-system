import type { AttendanceSource } from '@payroll-system/shared-types';
import { apiClient } from '../../../api/client';

// Mirrors attendance-record.entity.ts. Employee names are looked up via
// useEmployeesQuery, not a second lookup implementation. enteredByUser/
// overwrittenByUser ARE eager-loaded (id/name only, BUGS#19) by both list()
// and findByIdOrThrow().
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
  enteredByUser?: { id: string; name: string } | null;
  overwrittenBy: string | null;
  overwrittenByUser?: { id: string; name: string } | null;
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

// ATT-006 — direct bulk import of already-reconciled rows (source =
// csv_import), e.g. from an external attendance system's export. Despite the
// endpoint's name, the body is a JSON array of records, not a file — there is
// no spreadsheet to parse (unlike raw-logs' file import, RAWLOG-001). Mirrors
// AttendanceRecordsService.bulkImportCsv's return shape exactly: partial
// success is the normal outcome (some rows import, some conflict), never an
// all-or-nothing 400/409 for the whole batch.
export interface BulkImportAttendanceResult {
  createdOrUpdated: number;
  conflicts: string[];
}

export async function bulkImportAttendanceRecords(
  records: AttendanceRecordFormValues[],
  overwrite: boolean,
  reason?: string,
): Promise<BulkImportAttendanceResult> {
  const { data } = await apiClient.post<BulkImportAttendanceResult>(
    '/attendance-records/csv-import',
    { records, overwrite, reason },
  );
  return data;
}
