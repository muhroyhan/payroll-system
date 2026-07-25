import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSalaryMaster,
  listSalaryMasters,
  resolveSalaryForEmployee,
  updateSalaryMaster,
  type SalaryMasterFormValues,
} from './api';

export function useSalaryMastersQuery() {
  return useQuery({ queryKey: ['salary-master'], queryFn: listSalaryMasters });
}

export function useCreateSalaryMasterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SalaryMasterFormValues) => createSalaryMaster(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salary-master'] }),
  });
}

export function useUpdateSalaryMasterMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SalaryMasterFormValues>) => updateSalaryMaster(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salary-master'] }),
  });
}

// Shared by the employee detail page's read-only panel (FE-T06) and this
// module's own resolve-preview panel — same query key, same cache entry.
export function useResolveSalaryQuery(employeeId: string | undefined, asOf?: string) {
  return useQuery({
    queryKey: ['salary-master', 'resolve', employeeId, asOf],
    queryFn: () => resolveSalaryForEmployee(employeeId as string, asOf),
    enabled: !!employeeId,
  });
}
