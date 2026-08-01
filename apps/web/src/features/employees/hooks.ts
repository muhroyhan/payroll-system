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

// EMP-011 — retry: false, same as the other "404 is a real state" queries
// (salary-period-config, bpjs-kesehatan-master): an id that doesn't exist is
// a real, renderable 404, not a transient failure worth retrying. Without
// this, react-query's default 3 retries kept isLoading true for several
// seconds and QueryStateGuard never got past its Spin branch to render the
// 404 Result.
export function useEmployeeQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => getEmployee(id as string),
    enabled: !!id,
    retry: false,
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
      // SALARY-009 — changing division/department/position/employeeType
      // changes which salary-master rule resolves for this employee, but the
      // resolved-salary panel on the detail page (and this module's own
      // resolve-preview) reads a separate cache entry
      // (['salary-master', 'resolve', employeeId, asOf]) that an employee
      // update never touched, so it kept showing the pre-edit salary until a
      // manual reload. Same employeeId prefix covers every asOf variant.
      queryClient.invalidateQueries({ queryKey: ['salary-master', 'resolve', id] });
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
