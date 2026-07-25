import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSalaryPeriodConfig,
  upsertSalaryPeriodConfig,
  type SalaryPeriodConfigFormValues,
} from './api';

// retry: false — a 404 means "not configured yet," a real state to render,
// not a transient failure worth retrying.
export function useSalaryPeriodConfigQuery() {
  return useQuery({
    queryKey: ['salary-period-config'],
    queryFn: getSalaryPeriodConfig,
    retry: false,
  });
}

export function useUpsertSalaryPeriodConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SalaryPeriodConfigFormValues) => upsertSalaryPeriodConfig(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salary-period-config'] }),
  });
}
