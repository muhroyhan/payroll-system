import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listLeaveBalances,
  resolveLeaveBalancesForLeaveType,
  resolveOneLeaveBalance,
  updateLeaveBalanceQuota,
} from './api';

export function useLeaveBalancesQuery(employeeId?: string, year?: number) {
  return useQuery({
    queryKey: ['leave-balances', { employeeId, year }],
    queryFn: () => listLeaveBalances(employeeId, year),
  });
}

export function useResolveOneLeaveBalanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveOneLeaveBalance,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-balances'] }),
  });
}

export function useResolveLeaveBalancesForLeaveTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveLeaveBalancesForLeaveType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-balances'] }),
  });
}

export function useUpdateLeaveBalanceQuotaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quota }: { id: string; quota: number }) =>
      updateLeaveBalanceQuota(id, quota),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-balances'] }),
  });
}
