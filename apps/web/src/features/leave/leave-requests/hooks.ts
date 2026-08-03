import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationParams } from '../../../api/pagination';
import {
  approveLeaveRequest,
  createLeaveRequest,
  getLeaveRequest,
  listLeaveRequests,
  listLeaveRequestsPaginated,
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

// BUGS#2 — LeaveRequestListPage's server-paginated + server-filtered query;
// distinct from useLeaveRequestsQuery() above (HomePage's dashboard widget
// keeps using the unpaginated one) — same 'leave-requests' prefix so both
// still invalidate together on create/update/approve/reject.
export function useLeaveRequestsPaginatedQuery(
  params: PaginationParams & { employeeId?: string },
) {
  return useQuery({
    queryKey: ['leave-requests', 'paginated', params],
    queryFn: () => listLeaveRequestsPaginated(params),
    placeholderData: (previousData) => previousData,
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

// BUGS#16 — refetchType: 'none', see kasbon/hooks.ts's useRemoveKasbonMutation
// for why: avoids an eager (and needless, 404-bound) refetch of the detail
// query this mutation is always called from, right before it navigates away.
export function useRemoveLeaveRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeLeaveRequest(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['leave-requests'], refetchType: 'none' }),
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
