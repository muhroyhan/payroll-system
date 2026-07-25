import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveSuratIjin,
  createSuratIjin,
  getSuratIjin,
  listSuratIjin,
  rejectSuratIjin,
  removeSuratIjin,
  updateSuratIjin,
  type SuratIjinFormValues,
} from './api';

export function useSuratIjinListQuery(employeeId?: string) {
  return useQuery({
    queryKey: ['surat-ijin', { employeeId }],
    queryFn: () => listSuratIjin(employeeId),
  });
}

export function useSuratIjinQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['surat-ijin', id],
    queryFn: () => getSuratIjin(id as string),
    enabled: !!id,
  });
}

export function useCreateSuratIjinMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SuratIjinFormValues) => createSuratIjin(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-ijin'] }),
  });
}

export function useUpdateSuratIjinMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SuratIjinFormValues>) => updateSuratIjin(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surat-ijin'] });
      queryClient.invalidateQueries({ queryKey: ['surat-ijin', id] });
    },
  });
}

export function useRemoveSuratIjinMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeSuratIjin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-ijin'] }),
  });
}

export function useApproveSuratIjinMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveSuratIjin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surat-ijin'] });
      queryClient.invalidateQueries({ queryKey: ['surat-ijin', id] });
    },
  });
}

export function useRejectSuratIjinMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rejectSuratIjin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surat-ijin'] });
      queryClient.invalidateQueries({ queryKey: ['surat-ijin', id] });
    },
  });
}
