import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLeaveType,
  listLeaveTypes,
  removeLeaveType,
  updateLeaveType,
  type LeaveTypeFormValues,
} from './api';

export function useLeaveTypesQuery() {
  return useQuery({ queryKey: ['leave-types'], queryFn: listLeaveTypes });
}

export function useCreateLeaveTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeaveTypeFormValues) => createLeaveType(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-types'] }),
  });
}

export function useUpdateLeaveTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeaveTypeFormValues }) =>
      updateLeaveType(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-types'] }),
  });
}

export function useRemoveLeaveTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeLeaveType(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-types'] }),
  });
}
