import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPayslipTempComponent,
  listActivePayslipTempComponents,
  listPayslipTempComponents,
  removePayslipTempComponent,
  updatePayslipTempComponent,
  type PayslipTempComponentFormValues,
} from './api';

export function usePayslipTempComponentsQuery() {
  return useQuery({ queryKey: ['payslip-temp-components'], queryFn: listPayslipTempComponents });
}

export function useCreatePayslipTempComponentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PayslipTempComponentFormValues) => createPayslipTempComponent(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payslip-temp-components'] }),
  });
}

export function useUpdatePayslipTempComponentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PayslipTempComponentFormValues>) =>
      updatePayslipTempComponent(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payslip-temp-components'] }),
  });
}

export function useRemovePayslipTempComponentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removePayslipTempComponent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payslip-temp-components'] }),
  });
}

export function useActivePayslipTempComponentsQuery(employeeId: string | undefined, asOf?: string) {
  return useQuery({
    queryKey: ['payslip-temp-components', 'active', employeeId, asOf],
    queryFn: () => listActivePayslipTempComponents(employeeId as string, asOf),
    enabled: !!employeeId,
  });
}
