import { Injectable } from '@nestjs/common';

// §5.3 has_permission — "resolved against surat_ijin, if late/early was
// pre-approved". surat_ijin doesn't exist until Phase 4 (P4-T01), and wiring
// it into reconciliation is explicitly P4-T04's own task, not Phase 3's.
// Reconciliation depends on this interface, not on surat_ijin directly, so
// P4-T04 only has to provide a real implementation — no refactor of the
// reconciliation service itself.
export interface PermissionResolver {
  hasApprovedPermission(employeeId: string, date: string): Promise<boolean>;
}

export const PERMISSION_RESOLVER = Symbol('PERMISSION_RESOLVER');

@Injectable()
export class NoPermissionResolver implements PermissionResolver {
  hasApprovedPermission(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
