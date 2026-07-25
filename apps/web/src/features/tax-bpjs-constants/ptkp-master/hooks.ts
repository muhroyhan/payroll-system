import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPtkpMaster,
  listPtkpMasters,
  resolveEffectivePtkp,
  updatePtkpMaster,
  type PtkpMasterFormValues,
} from './api';

export function usePtkpMastersQuery() {
  return useQuery({ queryKey: ['ptkp-master'], queryFn: listPtkpMasters });
}

export function useCreatePtkpMasterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PtkpMasterFormValues) => createPtkpMaster(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ptkp-master'] }),
  });
}

export function useUpdatePtkpMasterMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PtkpMasterFormValues>) => updatePtkpMaster(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ptkp-master'] }),
  });
}

export function useResolveEffectivePtkpQuery(asOf: string) {
  return useQuery({
    queryKey: ['ptkp-master', 'effective', asOf],
    queryFn: () => resolveEffectivePtkp(asOf),
  });
}
