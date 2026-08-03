import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationParams } from '../../api/pagination';
import {
  approveKasbon,
  createKasbon,
  getKasbon,
  listKasbon,
  listKasbonPaginated,
  rejectKasbon,
  removeKasbon,
  updateKasbon,
  type KasbonFormValues,
} from './api';

export function useKasbonListQuery(employeeId?: string) {
  return useQuery({ queryKey: ['kasbon', { employeeId }], queryFn: () => listKasbon(employeeId) });
}

// BUGS#2 — KasbonListPage's server-paginated + server-filtered query;
// distinct from useKasbonListQuery() above (HomePage's dashboard widget
// keeps using the unpaginated one) — same 'kasbon' prefix so both still
// invalidate together on create/update/approve/reject.
export function useKasbonListPaginatedQuery(params: PaginationParams & { employeeId?: string }) {
  return useQuery({
    queryKey: ['kasbon', 'paginated', params],
    queryFn: () => listKasbonPaginated(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useKasbonQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['kasbon', id],
    queryFn: () => getKasbon(id as string),
    enabled: !!id,
  });
}

export function useCreateKasbonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KasbonFormValues) => createKasbon(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kasbon'] }),
  });
}

export function useUpdateKasbonMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<KasbonFormValues>) => updateKasbon(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kasbon'] });
      queryClient.invalidateQueries({ queryKey: ['kasbon', id] });
    },
  });
}

// BUGS#16 — refetchType: 'none': invalidateQueries' default ('active')
// would immediately refetch GET /kasbon/:id for the detail page this mutation
// is always called from (KasbonDetailPage), which is still mounted for a
// moment after mutateAsync() resolves and before navigate('/kasbon') actually
// unmounts it — hitting a needless 404 for a record that's already gone.
// Marking it stale (without eagerly refetching) is enough: the list page
// fetches fresh on its own next mount regardless.
export function useRemoveKasbonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeKasbon(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['kasbon'], refetchType: 'none' }),
  });
}

export function useApproveKasbonMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveKasbon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kasbon'] });
      queryClient.invalidateQueries({ queryKey: ['kasbon', id] });
    },
  });
}

export function useRejectKasbonMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => rejectKasbon(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kasbon'] });
      queryClient.invalidateQueries({ queryKey: ['kasbon', id] });
    },
  });
}
