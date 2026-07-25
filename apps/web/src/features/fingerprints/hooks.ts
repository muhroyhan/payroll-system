import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFingerprint,
  listFingerprints,
  removeFingerprint,
  updateFingerprint,
  type FingerprintFormValues,
} from './api';

export function useFingerprintsQuery() {
  return useQuery({ queryKey: ['fingerprints'], queryFn: listFingerprints });
}

export function useCreateFingerprintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FingerprintFormValues) => createFingerprint(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fingerprints'] }),
  });
}

export function useUpdateFingerprintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FingerprintFormValues> }) =>
      updateFingerprint(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fingerprints'] }),
  });
}

export function useRemoveFingerprintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeFingerprint(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fingerprints'] }),
  });
}
