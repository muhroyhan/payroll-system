import {
  Gender,
  MaritalStatus,
  PtkpStatus,
} from '@payroll-system/shared-types';
import { PtkpDerivationService } from './ptkp-derivation.service';

// §5.1a — protects the married-female exception (TC-PTKP-01, 02, 04) from
// regression. Override behavior (TC-PTKP-05) lives in EmployeesService, not here.
describe('PtkpDerivationService', () => {
  const service = new PtkpDerivationService();

  const derive = (
    maritalStatus: MaritalStatus,
    dependentCount: number,
    gender: Gender | null,
    spouseNoIncomeCertificate = false,
  ) =>
    service.derive({
      maritalStatus,
      dependentCount,
      gender,
      spouseNoIncomeCertificate,
    });

  it('TC-PTKP-01: single, 0 deps -> TK/0', () => {
    expect(derive(MaritalStatus.SINGLE, 0, Gender.MALE)).toBe(PtkpStatus.TK_0);
  });

  it('single female, 3 deps -> TK/3', () => {
    expect(derive(MaritalStatus.SINGLE, 3, Gender.FEMALE)).toBe(
      PtkpStatus.TK_3,
    );
  });

  it('TC-PTKP-02: married male, 2 deps -> K/2', () => {
    expect(derive(MaritalStatus.MARRIED, 2, Gender.MALE)).toBe(PtkpStatus.K_2);
  });

  it('TC-PTKP-04: married female, no certificate -> TK/0 (dependents on husband)', () => {
    expect(derive(MaritalStatus.MARRIED, 2, Gender.FEMALE, false)).toBe(
      PtkpStatus.TK_0,
    );
  });

  it('married female WITH Surat Keterangan -> K/{deps}', () => {
    expect(derive(MaritalStatus.MARRIED, 2, Gender.FEMALE, true)).toBe(
      PtkpStatus.K_2,
    );
  });

  it('legacy row with null gender, married -> falls back to K/{deps}', () => {
    expect(derive(MaritalStatus.MARRIED, 1, null)).toBe(PtkpStatus.K_1);
  });
});
