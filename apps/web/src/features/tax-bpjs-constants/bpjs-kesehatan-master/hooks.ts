import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBpjsKesehatanMaster,
  listBpjsKesehatanMasters,
  resolveEffectiveBpjsKesehatan,
  updateBpjsKesehatanMaster,
  type BpjsKesehatanMasterFormValues,
} from './api';

export function useBpjsKesehatanMastersQuery() {
  return useQuery({ queryKey: ['bpjs-kesehatan-master'], queryFn: listBpjsKesehatanMasters });
}

export function useCreateBpjsKesehatanMasterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BpjsKesehatanMasterFormValues) => createBpjsKesehatanMaster(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bpjs-kesehatan-master'] }),
  });
}

export function useUpdateBpjsKesehatanMasterMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<BpjsKesehatanMasterFormValues>) =>
      updateBpjsKesehatanMaster(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bpjs-kesehatan-master'] }),
  });
}

// retry: false — a 404 here means "genuinely not configured for this
// period," not a transient failure; retrying would just repeat it.
export function useResolveEffectiveBpjsKesehatanQuery(asOf: string) {
  return useQuery({
    queryKey: ['bpjs-kesehatan-master', 'effective', asOf],
    queryFn: () => resolveEffectiveBpjsKesehatan(asOf),
    retry: false,
  });
}
