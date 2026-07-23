import { Injectable } from '@nestjs/common';
import {
  Gender,
  MaritalStatus,
  PtkpStatus,
} from '@payroll-system/shared-types';

export interface PtkpDerivationInputs {
  maritalStatus: MaritalStatus;
  dependentCount: number; // already capped 0-3 by DTO validation
  gender: Gender | null;
  spouseNoIncomeCertificate: boolean;
}

// §5.1a — proposes ptkp_status from the raw inputs. HR can override the result
// via ptkp_manually_overridden for cases the rules below don't capture.
//
// Rules (DJP):
//   - Single                                  -> TK / dependentCount
//   - Married male                             -> K  / dependentCount
//   - Married female, NO Surat Keterangan      -> TK / 0   (default: her
//     dependents are claimed on the husband's PTKP, so they don't add to hers)
//   - Married female, WITH Surat Keterangan    -> K  / dependentCount
//     (husband has no income, so she claims the dependents herself)
//
// NOTE for Phase 7: the married-female-default -> TK/0 choice (rather than
// TK/dependentCount) follows §5.1a's "dependents assumed claimed on the
// husband's PTKP". This is a money-affecting detail — confirm it against a
// hand-verified worked example before the tax engine relies on it (P7-T01).
@Injectable()
export class PtkpDerivationService {
  derive(inputs: PtkpDerivationInputs): PtkpStatus {
    const { maritalStatus, dependentCount, gender, spouseNoIncomeCertificate } =
      inputs;

    if (maritalStatus === MaritalStatus.SINGLE) {
      return `TK/${dependentCount}` as PtkpStatus;
    }

    // Married.
    const marriedFemaleDefault =
      gender === Gender.FEMALE && !spouseNoIncomeCertificate;
    if (marriedFemaleDefault) {
      return PtkpStatus.TK_0;
    }

    // Married male, OR married female with the husband-no-income certificate.
    return `K/${dependentCount}` as PtkpStatus;
  }
}
