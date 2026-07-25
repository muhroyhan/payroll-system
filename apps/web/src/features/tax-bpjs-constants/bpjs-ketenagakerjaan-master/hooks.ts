import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBpjsKetenagakerjaanMaster,
  listBpjsKetenagakerjaanMasters,
  resolveEffectiveBpjsKetenagakerjaan,
  updateBpjsKetenagakerjaanMaster,
  type BpjsKetenagakerjaanMasterFormValues,
} from './api';

export function useBpjsKetenagakerjaanMastersQuery() {
  return useQuery({
    queryKey: ['bpjs-ketenagakerjaan-master'],
    queryFn: listBpjsKetenagakerjaanMasters,
  });
}

export function useCreateBpjsKetenagakerjaanMasterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BpjsKetenagakerjaanMasterFormValues) =>
      createBpjsKetenagakerjaanMaster(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['bpjs-ketenagakerjaan-master'] }),
  });
}

export function useUpdateBpjsKetenagakerjaanMasterMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<BpjsKetenagakerjaanMasterFormValues>) =>
      updateBpjsKetenagakerjaanMaster(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['bpjs-ketenagakerjaan-master'] }),
  });
}

export function useResolveEffectiveBpjsKetenagakerjaanQuery(asOf: string) {
  return useQuery({
    queryKey: ['bpjs-ketenagakerjaan-master', 'effective', asOf],
    queryFn: () => resolveEffectiveBpjsKetenagakerjaan(asOf),
    retry: false,
  });
}
