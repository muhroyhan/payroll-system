import {
  EmployeeActiveStatus,
  EmploymentStatus,
  Gender,
  MaritalStatus,
  PtkpStatus,
} from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — one exhaustive Record<Enum, …> per enum,
// imported from @payroll-system/shared-types. TypeScript refuses to compile
// any of these if a backend enum member is missing.

export const EMPLOYEE_ACTIVE_STATUS_LABELS: Record<EmployeeActiveStatus, StatusTagMeta> = {
  [EmployeeActiveStatus.ACTIVE]: { label: 'Aktif', color: 'green' },
  [EmployeeActiveStatus.INACTIVE]: { label: 'Nonaktif', color: 'default' },
};

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, StatusTagMeta> = {
  [MaritalStatus.SINGLE]: { label: 'Belum Menikah', color: 'default' },
  [MaritalStatus.MARRIED]: { label: 'Menikah', color: 'blue' },
};

export const GENDER_LABELS: Record<Gender, StatusTagMeta> = {
  [Gender.MALE]: { label: 'Laki-laki', color: 'default' },
  [Gender.FEMALE]: { label: 'Perempuan', color: 'default' },
};

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, StatusTagMeta> = {
  [EmploymentStatus.TETAP]: { label: 'Tetap', color: 'blue' },
  [EmploymentStatus.TIDAK_TETAP]: { label: 'Tidak Tetap', color: 'default' },
};

// §5.1a — the derivation service's output. The frontend never computes this
// (R-10); this map only labels the value the server already returned.
export const PTKP_STATUS_LABELS: Record<PtkpStatus, StatusTagMeta> = {
  [PtkpStatus.TK_0]: { label: 'TK/0', color: 'default' },
  [PtkpStatus.TK_1]: { label: 'TK/1', color: 'default' },
  [PtkpStatus.TK_2]: { label: 'TK/2', color: 'default' },
  [PtkpStatus.TK_3]: { label: 'TK/3', color: 'default' },
  [PtkpStatus.K_0]: { label: 'K/0', color: 'purple' },
  [PtkpStatus.K_1]: { label: 'K/1', color: 'purple' },
  [PtkpStatus.K_2]: { label: 'K/2', color: 'purple' },
  [PtkpStatus.K_3]: { label: 'K/3', color: 'purple' },
};
