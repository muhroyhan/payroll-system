import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveLeaveRequest,
  createLeaveRequest,
  getLeaveRequest,
  listLeaveRequests,
  rejectLeaveRequest,
  removeLeaveRequest,
  updateLeaveRequest,
  type LeaveRequestFormValues,
} from './api';

export function useLeaveRequestsQuery(employeeId?: string) {
  return useQuery({
    queryKey: ['leave-requests', { employeeId }],
    queryFn: () => listLeaveRequests(employeeId),
  });
}

export function useLeaveRequestQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['leave-requests', id],
    queryFn: () => getLeaveRequest(id as string),
    enabled: !!id,
  });
}

export function useCreateLeaveRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeaveRequestFormValues) => createLeaveRequest(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });
}

export function useUpdateLeaveRequestMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<LeaveRequestFormValues>) => updateLeaveRequest(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests', id] });
    },
  });
}

export function useRemoveLeaveRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeLeaveRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });
}

// Approval mutates leave_balances.used elsewhere in the app (§5.4) — the
// balances screen (FE-T13) reads through the same React Query cache, so its
// query key is invalidated here too rather than left stale.
export function useApproveLeaveRequestMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveLeaveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests', id] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });
}

export function useRejectLeaveRequestMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => rejectLeaveRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests', id] });
    },
  });
}
