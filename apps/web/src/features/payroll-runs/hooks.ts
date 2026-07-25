import { useQuery } from '@tanstack/react-query';
import { listPayrollRuns } from './api';

export function usePayrollRunsQuery() {
  return useQuery({ queryKey: ['payroll-runs'], queryFn: listPayrollRuns });
}
