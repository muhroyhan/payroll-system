import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveKasbon,
  createKasbon,
  getKasbon,
  listKasbon,
  rejectKasbon,
  removeKasbon,
  updateKasbon,
  type KasbonFormValues,
} from './api';

export function useKasbonListQuery(employeeId?: string) {
  return useQuery({ queryKey: ['kasbon', { employeeId }], queryFn: () => listKasbon(employeeId) });
}

export function useKasbonQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['kasbon', id],
    queryFn: () => getKasbon(id as string),
    enabled: !!id,
  });
}

export function useCreateKasbonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KasbonFormValues) => createKasbon(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kasbon'] }),
  });
}

export function useUpdateKasbonMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<KasbonFormValues>) => updateKasbon(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kasbon'] });
      queryClient.invalidateQueries({ queryKey: ['kasbon', id] });
    },
  });
}

export function useRemoveKasbonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeKasbon(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kasbon'] }),
  });
}

export function useApproveKasbonMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveKasbon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kasbon'] });
      queryClient.invalidateQueries({ queryKey: ['kasbon', id] });
    },
  });
}

export function useRejectKasbonMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rejectKasbon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kasbon'] });
      queryClient.invalidateQueries({ queryKey: ['kasbon', id] });
    },
  });
}
