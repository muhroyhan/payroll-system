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

export function useRemoveOvertimeLetterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeOvertimeLetter(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['overtime-letters'] }),
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
