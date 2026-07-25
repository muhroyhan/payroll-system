import { useQuery } from '@tanstack/react-query';
import { listPayslipComponents } from './api';

// 403s for HR staff (admin-only endpoint) — callers must handle
// query.isError gracefully, not render a broken Select (see
// SuratPeringatanFormFields.tsx).
export function usePayslipComponentsQuery() {
  return useQuery({ queryKey: ['payslip-components'], queryFn: listPayslipComponents });
}
