import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, listUsers, type CreateUserFormValues } from './api';

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
