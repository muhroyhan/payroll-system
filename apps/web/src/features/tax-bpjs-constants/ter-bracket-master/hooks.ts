import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TerCategory } from '@payroll-system/shared-types';
import {
  createTerBracketMaster,
  listTerBracketMasters,
  resolveEffectiveTerBrackets,
  updateTerBracketMaster,
  type TerBracketMasterFormValues,
} from './api';

export function useTerBracketMastersQuery() {
  return useQuery({ queryKey: ['ter-bracket-master'], queryFn: listTerBracketMasters });
}

export function useCreateTerBracketMasterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TerBracketMasterFormValues) => createTerBracketMaster(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ter-bracket-master'] }),
  });
}

export function useUpdateTerBracketMasterMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<TerBracketMasterFormValues>) => updateTerBracketMaster(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ter-bracket-master'] }),
  });
}

export function useResolveEffectiveTerBracketsQuery(asOf: string, category?: TerCategory) {
  return useQuery({
    queryKey: ['ter-bracket-master', 'effective', asOf, category],
    queryFn: () => resolveEffectiveTerBrackets(asOf, category),
  });
}
