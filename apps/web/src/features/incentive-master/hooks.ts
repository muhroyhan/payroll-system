import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIncentiveMaster,
  listIncentiveMasters,
  resolveIncentiveForEmployee,
  updateIncentiveMaster,
  type IncentiveMasterFormValues,
} from './api';

export function useIncentiveMastersQuery() {
  return useQuery({ queryKey: ['incentive-master'], queryFn: listIncentiveMasters });
}

export function useCreateIncentiveMasterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IncentiveMasterFormValues) => createIncentiveMaster(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incentive-master'] }),
  });
}

export function useUpdateIncentiveMasterMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<IncentiveMasterFormValues>) => updateIncentiveMaster(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incentive-master'] }),
  });
}

export function useResolveIncentiveQuery(employeeId: string | undefined, asOf?: string) {
  return useQuery({
    queryKey: ['incentive-master', 'resolve', employeeId, asOf],
    queryFn: () => resolveIncentiveForEmployee(employeeId as string, asOf),
    enabled: !!employeeId,
  });
}
