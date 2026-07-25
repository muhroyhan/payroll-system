import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOrgMaster,
  listOrgMaster,
  removeOrgMaster,
  updateOrgMaster,
  type OrgMasterInput,
  type OrgMasterKey,
} from './api';

// Query key mirrors the endpoint (§13.3, 06_FRONTEND_GENERAL.md) — one entry
// per resource key, e.g. ['org-master', 'divisions'].
export function useOrgMasterListQuery(key: OrgMasterKey) {
  return useQuery({
    queryKey: ['org-master', key],
    queryFn: () => listOrgMaster(key),
  });
}

export function useCreateOrgMasterMutation(key: OrgMasterKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OrgMasterInput) => createOrgMaster(key, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-master', key] }),
  });
}

export function useUpdateOrgMasterMutation(key: OrgMasterKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrgMasterInput }) =>
      updateOrgMaster(key, id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-master', key] }),
  });
}

export function useRemoveOrgMasterMutation(key: OrgMasterKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeOrgMaster(key, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-master', key] }),
  });
}
