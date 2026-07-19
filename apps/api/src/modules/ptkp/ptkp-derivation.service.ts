import { Injectable } from '@nestjs/common';
import { MaritalStatus, PtkpStatus } from '@payroll-system/shared-types';

// §5.1a — standard-case derivation only: TK if single, K if married, followed
// by dependent_count (already capped 0-3 by DTO validation before this runs).
// The married-female "still TK unless a Surat Keterangan is on file" exception
// is NOT modeled here (no gender field is tracked) — HR handles those cases
// via ptkp_manually_overridden instead of relying on this proposal.
@Injectable()
export class PtkpDerivationService {
  derive(maritalStatus: MaritalStatus, dependentCount: number): PtkpStatus {
    const prefix = maritalStatus === MaritalStatus.MARRIED ? 'K' : 'TK';
    return `${prefix}/${dependentCount}` as PtkpStatus;
  }
}
