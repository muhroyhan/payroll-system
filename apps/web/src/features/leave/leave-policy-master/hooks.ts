import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLeavePolicyMaster,
  listLeavePolicyMasters,
  resolveLeavePolicyForEmployee,
  updateLeavePolicyMaster,
  type LeavePolicyMasterFormValues,
} from './api';

export function useLeavePolicyMastersQuery() {
  return useQuery({ queryKey: ['leave-policy-master'], queryFn: listLeavePolicyMasters });
}

export function useCreateLeavePolicyMasterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeavePolicyMasterFormValues) => createLeavePolicyMaster(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-policy-master'] }),
  });
}

export function useUpdateLeavePolicyMasterMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<LeavePolicyMasterFormValues>) =>
      updateLeavePolicyMaster(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-policy-master'] }),
  });
}

export function useResolveLeavePolicyQuery(
  employeeId: string | undefined,
  leaveTypeId: string | undefined,
  asOf?: string,
) {
  return useQuery({
    queryKey: ['leave-policy-master', 'resolve', employeeId, leaveTypeId, asOf],
    queryFn: () => resolveLeavePolicyForEmployee(employeeId as string, leaveTypeId as string, asOf),
    enabled: !!employeeId && !!leaveTypeId,
  });
}
