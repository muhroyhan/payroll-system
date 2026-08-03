import { PayslipLineSource } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>, all 8 sources
// verified against packages/shared-types/src/enums/payslip-line-source.ts.
export const PAYSLIP_LINE_SOURCE_LABELS: Record<PayslipLineSource, StatusTagMeta> = {
  [PayslipLineSource.SALARY_MASTER]: { label: 'Gaji Pokok', color: 'default' },
  [PayslipLineSource.INCENTIVE_MASTER]: { label: 'Insentif', color: 'cyan' },
  [PayslipLineSource.TEMP_COMPONENT]: { label: 'Komponen Sementara', color: 'purple' },
  [PayslipLineSource.KASBON]: { label: 'Kasbon', color: 'orange' },
  [PayslipLineSource.SANCTION]: { label: 'Sanksi (SP)', color: 'red' },
  [PayslipLineSource.OVERTIME]: { label: 'Lembur', color: 'geekblue' },
  [PayslipLineSource.TAX]: { label: 'Pajak (PPh21)', color: 'volcano' },
  [PayslipLineSource.BPJS]: { label: 'BPJS', color: 'green' },
};

// §15.13 — "lines whose sourceId is non-null deep-link to the originating
// record (the kasbon, the SP, the overtime letter)". Only these three
// sources have a per-instance detail screen to link to; salary_master/
// incentive_master/temp_component's sourceId points at master-config rows
// with no per-instance route, and tax/bpjs lines have a null sourceId by
// design (§15.13) — those five render as plain text, not a broken link.
export const PAYSLIP_LINE_SOURCE_LINK_BASE: Partial<Record<PayslipLineSource, string>> = {
  [PayslipLineSource.KASBON]: '/kasbon',
  [PayslipLineSource.SANCTION]: '/letters/surat-peringatan',
  [PayslipLineSource.OVERTIME]: '/letters/overtime',
};

// §11 — payslips are CRU-only (no PUT/DELETE endpoint at all); shown on
// both the list and detail screens so the "why no edit button" question is
// answered right where its absence is visible, not left to be inferred.
export const PAYSLIP_CORRECTION_GUIDANCE =
  'Payslip tidak bisa diedit/dihapus. Untuk koreksi, revert payroll run terkait (jika masih calculated) atau sesuaikan di periode berikutnya.';
