import { BadRequestException } from '@nestjs/common';
import {
  EmploymentStatus,
  Gender,
  MaritalStatus,
  PtkpStatus,
  Role,
} from '@payroll-system/shared-types';
import { EmployeesService } from './employees.service';

// Audit-trail follow-up (dispute-traceability review, §D/HIGH) —
// ptkpManuallyOverridden previously flipped with zero record of who/when/why,
// despite feeding PPh21 withholding directly. These tests assert
// ptkpOverriddenBy/ptkpOverriddenAt/ptkpOverriddenReason are written from the
// ACTUAL logged-in user (never a dto-supplied value), only at the on/off
// transition, and that activating without a reason is rejected outright.
describe('EmployeesService — ptkp override audit trail', () => {
  const baseDto = {
    name: 'Budi',
    nik: '1234567890123456',
    maritalStatus: MaritalStatus.SINGLE,
    gender: Gender.MALE,
    dependentCount: 0,
    employmentStatus: EmploymentStatus.TETAP,
    employeeTypeId: 'et-1',
    positionId: 'pos-1',
    departmentId: 'dept-1',
    divisionId: 'div-1',
    startDate: '2026-01-01',
  };

  function record(overrides: Record<string, unknown> = {}) {
    return {
      id: 'emp-1',
      ptkpManuallyOverridden: false,
      ptkpStatus: PtkpStatus.TK_0,
      maritalStatus: MaritalStatus.SINGLE,
      dependentCount: 0,
      gender: Gender.MALE,
      spouseNoIncomeCertificate: false,
      ptkpOverriddenBy: null,
      ptkpOverriddenAt: null,
      ptkpOverriddenReason: null,
      update: jest.fn().mockImplementation(function (this: any, patch: any) {
        Object.assign(this, patch);
        return Promise.resolve(this);
      }),
      ...overrides,
    };
  }

  function makeService(existing: any = null) {
    const created = { id: 'emp-1' };
    const model = {
      create: jest.fn().mockResolvedValue(created),
      findByPk: jest.fn().mockResolvedValue(existing ?? created),
    };
    const ptkpDerivationService = {
      derive: jest.fn().mockReturnValue(PtkpStatus.TK_0),
    };
    const service = new EmployeesService(
      model as any,
      ptkpDerivationService as any,
    );
    return { service, model, ptkpDerivationService };
  }

  describe('create()', () => {
    it('does not set any override-tracking field when ptkpManuallyOverridden is not set', async () => {
      const { service, model } = makeService();
      await service.create({ ...baseDto } as any, 'user-1', Role.HR_STAFF);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ptkpManuallyOverridden: false,
          ptkpOverriddenBy: null,
          ptkpOverriddenAt: null,
          ptkpOverriddenReason: null,
        }),
        expect.anything(),
      );
    });

    it('records the ACTUAL logged-in user (not a dto value) + reason when created already overridden', async () => {
      const { service, model } = makeService();
      await service.create(
        {
          ...baseDto,
          ptkpManuallyOverridden: true,
          ptkpStatus: PtkpStatus.K_1,
          ptkpOverrideReason: 'SK Pengadilan terlampir',
        } as any,
        'user-logged-in',
        Role.HR_STAFF,
      );
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ptkpManuallyOverridden: true,
          ptkpOverriddenBy: 'user-logged-in',
          ptkpOverriddenAt: expect.any(Date),
          ptkpOverriddenReason: 'SK Pengadilan terlampir',
        }),
        expect.objectContaining({
          actorId: 'user-logged-in',
          actorRole: Role.HR_STAFF,
        }),
      );
    });

    it('rejects activating the override without a reason', async () => {
      const { service, model } = makeService();
      await expect(
        service.create(
          {
            ...baseDto,
            ptkpManuallyOverridden: true,
            ptkpStatus: PtkpStatus.K_1,
          } as any,
          'user-1',
          Role.HR_STAFF,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('sets ptkpOverriddenBy/At/Reason from the current user on the false -> true transition', async () => {
      const r = record({ ptkpManuallyOverridden: false });
      const { service } = makeService(r);
      await service.update(
        'emp-1',
        {
          ptkpManuallyOverridden: true,
          ptkpStatus: PtkpStatus.K_1,
          ptkpOverrideReason: 'Surat keterangan HR-042',
        } as any,
        'approver-2',
        Role.ADMIN,
      );
      expect(r.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ptkpManuallyOverridden: true,
          ptkpOverriddenBy: 'approver-2',
          ptkpOverriddenAt: expect.any(Date),
          ptkpOverriddenReason: 'Surat keterangan HR-042',
        }),
        expect.objectContaining({ actorId: 'approver-2', actorRole: Role.ADMIN }),
      );
    });

    it('rejects the false -> true transition without a reason', async () => {
      const r = record({ ptkpManuallyOverridden: false });
      const { service } = makeService(r);
      await expect(
        service.update(
          'emp-1',
          { ptkpManuallyOverridden: true, ptkpStatus: PtkpStatus.K_1 } as any,
          'approver-2',
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(r.update).not.toHaveBeenCalled();
    });

    it('does NOT overwrite the historical actor/reason while the override stays on across an unrelated edit', async () => {
      const r = record({
        ptkpManuallyOverridden: true,
        ptkpOverriddenBy: 'original-approver',
        ptkpOverriddenAt: new Date('2026-01-01T00:00:00Z'),
        ptkpOverriddenReason: 'Alasan asli',
      });
      const { service } = makeService(r);
      // Someone else edits an unrelated field (e.g. location) while resubmitting
      // the whole form, which resends ptkpManuallyOverridden: true unchanged.
      await service.update(
        'emp-1',
        {
          ptkpManuallyOverridden: true,
          ptkpStatus: PtkpStatus.K_1,
          location: 'Jakarta',
          ptkpOverrideReason: 'a different, unrelated reason',
        } as any,
        'someone-else',
        Role.ADMIN,
      );
      const patch = (r.update as jest.Mock).mock.calls[0][0];
      expect(patch.ptkpOverriddenBy).toBeUndefined();
      expect(patch.ptkpOverriddenAt).toBeUndefined();
      expect(patch.ptkpOverriddenReason).toBeUndefined();
      // The historical fields on the record itself are untouched.
      expect(r.ptkpOverriddenBy).toBe('original-approver');
      expect(r.ptkpOverriddenReason).toBe('Alasan asli');
    });

    it('clears ptkpOverriddenBy/At/Reason together on the true -> false transition', async () => {
      const r = record({
        ptkpManuallyOverridden: true,
        ptkpOverriddenBy: 'original-approver',
        ptkpOverriddenAt: new Date('2026-01-01T00:00:00Z'),
        ptkpOverriddenReason: 'Alasan asli',
      });
      const { service } = makeService(r);
      await service.update(
        'emp-1',
        { ptkpManuallyOverridden: false } as any,
        'someone-else',
        Role.ADMIN,
      );
      expect(r.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ptkpManuallyOverridden: false,
          ptkpOverriddenBy: null,
          ptkpOverriddenAt: null,
          ptkpOverriddenReason: null,
        }),
        expect.anything(),
      );
    });
  });
});

// EMP-013 — a bank account under someone else's name can't actually be paid
// into for this employee; reject it outright rather than accepting it
// silently.
describe('EmployeesService — bank account holder name must match', () => {
  const baseDto = {
    name: 'Rina Apriana',
    nik: '1234567890123456',
    maritalStatus: MaritalStatus.SINGLE,
    gender: Gender.FEMALE,
    dependentCount: 0,
    employmentStatus: EmploymentStatus.TETAP,
    employeeTypeId: 'et-1',
    positionId: 'pos-1',
    departmentId: 'dept-1',
    divisionId: 'div-1',
    startDate: '2026-01-01',
  };

  function makeService(existing: any = null) {
    const created = { id: 'emp-1' };
    const model = {
      create: jest.fn().mockResolvedValue(created),
      findByPk: jest.fn().mockResolvedValue(existing ?? created),
    };
    const ptkpDerivationService = {
      derive: jest.fn().mockReturnValue(PtkpStatus.TK_0),
    };
    const service = new EmployeesService(
      model as any,
      ptkpDerivationService as any,
    );
    return { service, model };
  }

  describe('create()', () => {
    it('rejects when bankAccountHolderName differs from the employee name', async () => {
      const { service, model } = makeService();
      await expect(
        service.create(
          { ...baseDto, bankAccountHolderName: 'Someone Else' } as any,
          'user-1',
          Role.HR_STAFF,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('accepts a case-insensitive/whitespace-trimmed match', async () => {
      const { service, model } = makeService();
      await service.create(
        { ...baseDto, bankAccountHolderName: '  RINA APRIANA  ' } as any,
        'user-1',
        Role.HR_STAFF,
      );
      expect(model.create).toHaveBeenCalled();
    });

    it('does not validate when bankAccountHolderName is left blank', async () => {
      const { service, model } = makeService();
      await service.create({ ...baseDto } as any, 'user-1', Role.HR_STAFF);
      expect(model.create).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    function record(overrides: Record<string, unknown> = {}) {
      return {
        id: 'emp-1',
        name: 'Rina Apriana',
        bankAccountHolderName: null,
        ptkpManuallyOverridden: false,
        ptkpStatus: PtkpStatus.TK_0,
        maritalStatus: MaritalStatus.SINGLE,
        dependentCount: 0,
        gender: Gender.FEMALE,
        spouseNoIncomeCertificate: false,
        update: jest.fn().mockImplementation(function (this: any, patch: any) {
          Object.assign(this, patch);
          return Promise.resolve(this);
        }),
        ...overrides,
      };
    }

    it('rejects setting a bankAccountHolderName that differs from the current record name', async () => {
      const r = record();
      const { service } = makeService(r);
      await expect(
        service.update(
          'emp-1',
          { bankAccountHolderName: 'Someone Else' } as any,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(r.update).not.toHaveBeenCalled();
    });

    it('rejects when the name is being changed away from an already-set bankAccountHolderName', async () => {
      const r = record({ bankAccountHolderName: 'Rina Apriana' });
      const { service } = makeService(r);
      await expect(
        service.update(
          'emp-1',
          { name: 'Rina Apriana Wijaya' } as any,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(r.update).not.toHaveBeenCalled();
    });

    it('accepts an unrelated field edit when the existing bankAccountHolderName still matches the name', async () => {
      const r = record({ bankAccountHolderName: 'Rina Apriana' });
      const { service } = makeService(r);
      await service.update(
        'emp-1',
        { location: 'Jakarta' } as any,
        'user-1',
        Role.ADMIN,
      );
      expect(r.update).toHaveBeenCalled();
    });
  });
});
