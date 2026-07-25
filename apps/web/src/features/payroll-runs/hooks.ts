import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import {
  approvePayrollRun,
  calculatePayrollRun,
  createPayrollRun,
  disbursePayrollRun,
  getPayrollRun,
  listPayrollRuns,
  revertPayrollRunToDraft,
  type PayrollRun,
  type PayrollRunFormValues,
} from './api';

// Query key ['payroll-runs'] is shared with FE-T17's attendance period-lock
// banner (features/attendance/records/AttendanceRecordsPage.tsx) — do NOT
// introduce a second key for the list. Every mutation below invalidates
// this same key so that banner updates the moment a run's status changes,
// without a second fetch path to keep in sync.
export function usePayrollRunsQuery() {
  return useQuery({ queryKey: ['payroll-runs'], queryFn: listPayrollRuns });
}

// §13.3/FE-T27 — polls while a calculation is genuinely in flight: `status`
// is still 'draft' (there is no 'calculating' value, verified against
// shared-types) AND totalCount > 0 (a calculation has actually been
// requested — a fresh, never-calculated draft has totalCount 0 and must NOT
// poll). Stops the instant status flips away from 'draft'.
export function usePayrollRunQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['payroll-runs', id],
    queryFn: () => getPayrollRun(id as string),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as PayrollRun | undefined;
      if (!data) return false;
      const isCalculating = data.status === PayrollRunStatus.DRAFT && data.totalCount > 0;
      return isCalculating ? 2000 : false;
    },
  });
}

export function useCreatePayrollRunMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PayrollRunFormValues) => createPayrollRun(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-runs'] }),
  });
}

export function useCalculatePayrollRunMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => calculatePayrollRun(id),
    onSuccess: () => {
      // 202 doesn't mean "done" — invalidate so the next poll picks up
      // totalCount as soon as the job sets it, not before.
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs', id] });
    },
  });
}

export function useApprovePayrollRunMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approvePayrollRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs', id] });
    },
  });
}

export function useDisbursePayrollRunMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disbursePayrollRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs', id] });
    },
  });
}

// Reverting unlocks attendance for this run's period (FE-T17's banner reads
// the same ['payroll-runs'] query) — invalidating it here is what makes that
// banner disappear without a manual refresh.
export function useRevertPayrollRunMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => revertPayrollRunToDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs', id] });
    },
  });
}
