import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEmployee,
  getEmployee,
  importEmployees,
  listEmployees,
  updateEmployee,
  type EmployeeFormValues,
} from './api';

export function useEmployeesQuery() {
  return useQuery({ queryKey: ['employees'], queryFn: listEmployees });
}

export function useEmployeeQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => getEmployee(id as string),
    enabled: !!id,
  });
}

export function useCreateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeFormValues) => createEmployee(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useUpdateEmployeeMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<EmployeeFormValues>) => updateEmployee(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', id] });
    },
  });
}

// FE-T07 — no cache to invalidate mid-import; the caller refetches the list
// once the whole file has been processed (EmployeeImportPage.tsx).
export function useImportEmployeesMutation() {
  return useMutation({ mutationFn: (file: File) => importEmployees(file) });
}

// The employee detail page's read-only resolved base salary panel (§15.4)
// uses features/salary-master/hooks.ts's useResolveSalaryQuery directly —
// same query, same cache entry as this module's own resolve-preview panel
// (FE-T09), so it isn't duplicated here.
