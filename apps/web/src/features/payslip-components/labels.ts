import { PayslipComponentType } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>.
export const PAYSLIP_COMPONENT_TYPE_LABELS: Record<PayslipComponentType, StatusTagMeta> = {
  [PayslipComponentType.EARNING]: { label: 'Penghasilan', color: 'green' },
  [PayslipComponentType.DEDUCTION]: { label: 'Potongan', color: 'red' },
};
