import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  deactivateUser,
  listUsers,
  reactivateUser,
  type CreateUserFormValues,
} from './api';

export function useUsersQuery() {
  return useQuery({ queryKey: ['users'], queryFn: listUsers });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserFormValues) => createUser(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

// USER-005 — the backend has had dedicated deactivate/reactivate routes all
// along (users.controller.ts); this screen just never grew the buttons for
// them.
export function useDeactivateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useReactivateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivateUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
