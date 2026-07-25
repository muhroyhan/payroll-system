import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAttendanceRawLog,
  importAttendanceRawLogs,
  listAttendanceRawLogs,
  removeAttendanceRawLog,
  type AttendanceRawLogFormValues,
} from './api';

// R-08 — enabled only once a filter is actually set (RawLogsPage.tsx passes
// undefined/undefined until the admin picks one), never an unfiltered fetch.
export function useAttendanceRawLogsQuery(deviceUserId?: string, deviceId?: string) {
  return useQuery({
    queryKey: ['attendance-raw-logs', { deviceUserId, deviceId }],
    queryFn: () => listAttendanceRawLogs(deviceUserId, deviceId),
    enabled: !!deviceUserId || !!deviceId,
  });
}

export function useCreateAttendanceRawLogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AttendanceRawLogFormValues) => createAttendanceRawLog(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-raw-logs'] }),
  });
}

export function useRemoveAttendanceRawLogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeAttendanceRawLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-raw-logs'] }),
  });
}

export function useImportAttendanceRawLogsMutation() {
  return useMutation({ mutationFn: (file: File) => importAttendanceRawLogs(file) });
}
