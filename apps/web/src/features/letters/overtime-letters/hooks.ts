import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOvertimeLetter,
  getOvertimeLetter,
  listOvertimeLetters,
  rejectOvertimeLetter,
  removeOvertimeLetter,
  updateOvertimeLetter,
  verifyOvertimeLetter,
  type OvertimeLetterFormValues,
} from './api';

export function useOvertimeLettersQuery(employeeId?: string) {
  return useQuery({
    queryKey: ['overtime-letters', { employeeId }],
    queryFn: () => listOvertimeLetters(employeeId),
  });
}

export function useOvertimeLetterQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['overtime-letters', id],
    queryFn: () => getOvertimeLetter(id as string),
    enabled: !!id,
  });
}

export function useCreateOvertimeLetterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OvertimeLetterFormValues) => createOvertimeLetter(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['overtime-letters'] }),
  });
}

export function useUpdateOvertimeLetterMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<OvertimeLetterFormValues>) => updateOvertimeLetter(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-letters'] });
      queryClient.invalidateQueries({ queryKey: ['overtime-letters', id] });
    },
  });
}

// BUGS#16 — refetchType: 'none', see kasbon/hooks.ts's useRemoveKasbonMutation
// for why: avoids an eager (and needless, 404-bound) refetch of the detail
// query this mutation is always called from, right before it navigates away.
export function useRemoveOvertimeLetterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeOvertimeLetter(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['overtime-letters'], refetchType: 'none' }),
  });
}

export function useVerifyOvertimeLetterMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => verifyOvertimeLetter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-letters'] });
      queryClient.invalidateQueries({ queryKey: ['overtime-letters', id] });
    },
  });
}

export function useRejectOvertimeLetterMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => rejectOvertimeLetter(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-letters'] });
      queryClient.invalidateQueries({ queryKey: ['overtime-letters', id] });
    },
  });
}
