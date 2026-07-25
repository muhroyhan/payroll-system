import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createHoliday,
  listHolidays,
  removeHoliday,
  syncHolidays,
  updateHoliday,
  type HolidayFormValues,
} from './api';

export function useHolidaysQuery(from?: string, to?: string) {
  return useQuery({
    queryKey: ['holidays', { from, to }],
    queryFn: () => listHolidays(from, to),
  });
}

export function useCreateHolidayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HolidayFormValues) => createHoliday(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useUpdateHolidayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<HolidayFormValues> }) =>
      updateHoliday(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useRemoveHolidayMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeHoliday(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useSyncHolidaysMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (year: number | undefined) => syncHolidays(year),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  });
}
