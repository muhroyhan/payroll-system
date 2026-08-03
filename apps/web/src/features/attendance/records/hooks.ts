import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bulkImportAttendanceRecords,
  createAttendanceRecord,
  listAttendanceRecords,
  reconcileAttendance,
  type AttendanceRecordFormValues,
  type ReconcileRangeInput,
} from './api';

// R-08 — the caller always supplies from/to (a single month); this hook
// takes no "unfiltered" shape at all, unlike raw-logs' optional filters.
export function useAttendanceRecordsQuery(
  employeeId: string | undefined,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: ['attendance-records', { employeeId, from, to }],
    queryFn: () => listAttendanceRecords(employeeId, from, to),
  });
}

export function useCreateAttendanceRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      overwrite,
    }: {
      input: AttendanceRecordFormValues;
      overwrite: boolean;
    }) => createAttendanceRecord(input, overwrite),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-records'] }),
  });
}

export function useReconcileAttendanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReconcileRangeInput) => reconcileAttendance(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-records'] }),
  });
}

// ATT-006 — always invalidates on success even though some rows may have
// conflicted: whatever DID import/update is real and should show up.
export function useBulkImportAttendanceRecordsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      records,
      overwrite,
      reason,
    }: {
      records: AttendanceRecordFormValues[];
      overwrite: boolean;
      reason?: string;
    }) => bulkImportAttendanceRecords(records, overwrite, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-records'] }),
  });
}
