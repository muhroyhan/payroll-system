import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPayslipComponent,
  listPayslipComponents,
  updatePayslipComponent,
  type PayslipComponentFormValues,
} from './api';

// 403s for HR staff (admin-only endpoint) — callers must handle
// query.isError gracefully, not render a broken Select (see
// SuratPeringatanFormFields.tsx / PayslipTempComponentFormFields.tsx).
export function usePayslipComponentsQuery() {
  return useQuery({ queryKey: ['payslip-components'], queryFn: listPayslipComponents });
}

export function useCreatePayslipComponentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PayslipComponentFormValues) => createPayslipComponent(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payslip-components'] }),
  });
}

export function useUpdatePayslipComponentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PayslipComponentFormValues> }) =>
      updatePayslipComponent(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payslip-components'] }),
  });
}
