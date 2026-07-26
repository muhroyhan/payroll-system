import { useQuery } from '@tanstack/react-query';
import { getPayslip, listPayslips } from './api';

export function usePayslipsQuery(payrollRunId: string | undefined) {
  return useQuery({
    queryKey: ['payslips', { payrollRunId }],
    queryFn: () => listPayslips(payrollRunId as string),
    enabled: !!payrollRunId,
  });
}

export function usePayslipQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['payslips', id],
    queryFn: () => getPayslip(id as string),
    enabled: !!id,
  });
}
