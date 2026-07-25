import { Role } from '@payroll-system/shared-types';
import type { StatusTagMeta } from '../../components/statusTagTypes';

// R-05 (07_FRONTEND_RULES.md) — exhaustive Record<Enum, …>, imported from
// shared-types. Also used by routes/ProtectedLayout.tsx's user-menu label
// (previously a raw isAdmin ? 'Admin' : 'HR Staff' ternary) so a third role
// would be a compile error here, not a silently wrong label there.
export const ROLE_LABELS: Record<Role, StatusTagMeta> = {
  [Role.ADMIN]: { label: 'Admin', color: 'purple' },
  [Role.HR_STAFF]: { label: 'HR Staff', color: 'blue' },
};
