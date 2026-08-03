import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSuratPeringatan,
  getSuratPeringatan,
  listSuratPeringatan,
  removeSuratPeringatan,
  updateSuratPeringatan,
  type SuratPeringatanFormValues,
} from './api';

export function useSuratPeringatanListQuery(employeeId?: string) {
  return useQuery({
    queryKey: ['surat-peringatan', { employeeId }],
    queryFn: () => listSuratPeringatan(employeeId),
  });
}

export function useSuratPeringatanQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['surat-peringatan', id],
    queryFn: () => getSuratPeringatan(id as string),
    enabled: !!id,
  });
}

export function useCreateSuratPeringatanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SuratPeringatanFormValues) => createSuratPeringatan(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-peringatan'] }),
  });
}

export function useUpdateSuratPeringatanMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SuratPeringatanFormValues>) => updateSuratPeringatan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surat-peringatan'] });
      queryClient.invalidateQueries({ queryKey: ['surat-peringatan', id] });
    },
  });
}

// BUGS#16 — refetchType: 'none', see kasbon/hooks.ts's useRemoveKasbonMutation
// for why: avoids an eager (and needless, 404-bound) refetch of the detail
// query this mutation is always called from, right before it navigates away.
export function useRemoveSuratPeringatanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeSuratPeringatan(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['surat-peringatan'], refetchType: 'none' }),
  });
}
