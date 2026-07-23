import { Injectable } from '@nestjs/common';
import type { PermissionResolver } from '../../attendance/permission-resolver.interface';
import { SuratIjinService } from './surat-ijin.service';

// P4-T04 — real implementation of the PermissionResolver interface
// reconciliation (§5.3) has depended on since P3-T03/NoPermissionResolver.
// This is the DI swap that task was written for: attendance.module.ts binds
// PERMISSION_RESOLVER to this class instead of the stub. The reconciliation
// service itself is untouched — it only ever talks to the interface.
@Injectable()
export class SuratIjinPermissionResolver implements PermissionResolver {
  constructor(private readonly suratIjinService: SuratIjinService) {}

  async hasApprovedPermission(
    employeeId: string,
    date: string,
  ): Promise<boolean> {
    const record = await this.suratIjinService.findApprovedForDate(
      employeeId,
      date,
    );
    return record !== null;
  }
}
