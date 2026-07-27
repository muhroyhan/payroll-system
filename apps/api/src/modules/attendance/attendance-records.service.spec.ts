import { ConflictException } from '@nestjs/common';
import { AttendanceSource } from '@payroll-system/shared-types';
import { AttendanceRecordsService } from './attendance-records.service';

// TC-ATT-07 — exactly one attendance_records row per (employee, date),
// regardless of source. Mocks the Sequelize model so this runs without a DB.
describe('AttendanceRecordsService.upsert (TC-ATT-07)', () => {
  const baseInput = {
    employeeId: 'emp-1',
    date: '2026-06-15',
    clockIn: new Date('2026-06-15T08:00:00'),
    clockOut: new Date('2026-06-15T17:00:00'),
    overtimeHours: 0,
    hasMissedClockOut: false,
    isHoliday: false,
    isOnLeave: false,
    hasPermission: false,
  };

  function makeService(
    existing: { source: AttendanceSource; update: jest.Mock } | null,
    periodLocked = false,
  ) {
    const model = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue({ id: 'new-row' }),
    };
    const payrollPeriodLock = {
      isPeriodLocked: jest.fn().mockResolvedValue(periodLocked),
      assertPeriodEditable: jest
        .fn()
        .mockImplementation(() =>
          periodLocked
            ? Promise.reject(new ConflictException('locked'))
            : Promise.resolve(),
        ),
    };
    const service = new AttendanceRecordsService(
      model as any,
      payrollPeriodLock as any,
    );
    return { service, model, payrollPeriodLock };
  }

  it('creates a new row when none exists for this employee/date', async () => {
    const { service, model } = makeService(null);
    await service.upsert({
      ...baseInput,
      source: AttendanceSource.FINGERPRINT,
    });
    expect(model.create).toHaveBeenCalledTimes(1);
  });

  it('updates in place when re-run with the SAME source (no conflict)', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'row-1' });
    const { service } = makeService({
      source: AttendanceSource.FINGERPRINT,
      update,
    });

    await service.upsert({
      ...baseInput,
      source: AttendanceSource.FINGERPRINT,
    });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('rejects a DIFFERENT source colliding on the same day by default (no silent duplication)', async () => {
    const update = jest.fn();
    const { service } = makeService({
      source: AttendanceSource.CSV_IMPORT,
      update,
    });

    await expect(
      service.upsert({ ...baseInput, source: AttendanceSource.FINGERPRINT }),
    ).rejects.toThrow(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it('allows the collision when overwrite=true is explicit', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'row-1' });
    const { service } = makeService({
      source: AttendanceSource.CSV_IMPORT,
      update,
    });

    await service.upsert(
      { ...baseInput, source: AttendanceSource.FINGERPRINT },
      true,
    );
    expect(update).toHaveBeenCalledTimes(1);
  });

  // §11 / TC-PAYROLL-04 (P8-T07) — a period whose payroll run is past draft is
  // locked for attendance edits, regardless of source or overwrite.
  it('rejects any write when the period is locked by a payroll run past draft', async () => {
    const { service, model } = makeService(null, true);

    await expect(
      service.upsert({ ...baseInput, source: AttendanceSource.FINGERPRINT }),
    ).rejects.toThrow(ConflictException);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('checks the lock BEFORE the source-collision check (period lock wins)', async () => {
    const update = jest.fn();
    const { service, payrollPeriodLock } = makeService(
      { source: AttendanceSource.CSV_IMPORT, update },
      true,
    );

    await expect(
      service.upsert(
        { ...baseInput, source: AttendanceSource.FINGERPRINT },
        true, // even with overwrite, the period lock still blocks
      ),
    ).rejects.toThrow(ConflictException);
    expect(payrollPeriodLock.assertPeriodEditable).toHaveBeenCalledWith(
      '2026-06',
    );
    expect(update).not.toHaveBeenCalled();
  });
});

// Audit-trail follow-up (dispute-traceability review, §D) — entered_by/
// overwritten_by previously didn't exist at all; these assert the actor is
// recorded correctly through all three write paths that funnel through
// upsert() (manual entry, CSV import, reconciliation — the latter is covered
// separately in attendance-reconciliation.service.spec.ts since it threads
// through a different service first).
describe('AttendanceRecordsService — actor threading (audit-trail follow-up, §D)', () => {
  const baseInput = {
    employeeId: 'emp-1',
    date: '2026-06-15',
    clockIn: new Date('2026-06-15T08:00:00'),
    clockOut: new Date('2026-06-15T17:00:00'),
    overtimeHours: 0,
    hasMissedClockOut: false,
    isHoliday: false,
    isOnLeave: false,
    hasPermission: false,
  };
  const actor = { id: 'user-1', role: 'admin' };

  function makeService(existing: { source: AttendanceSource; update: jest.Mock } | null) {
    const model = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue({ id: 'new-row' }),
    };
    const payrollPeriodLock = {
      assertPeriodEditable: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AttendanceRecordsService(
      model as any,
      payrollPeriodLock as any,
    );
    return { service, model };
  }

  it('upsert(): a manual-source create sets enteredBy to the actor and threads actorId/actorRole to the hook', async () => {
    const { service, model } = makeService(null);

    await service.upsert(
      { ...baseInput, source: AttendanceSource.MANUAL },
      false,
      actor,
      'Koreksi jam masuk',
    );

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ enteredBy: 'user-1', overwrittenBy: null }),
      expect.objectContaining({
        actorId: 'user-1',
        actorRole: 'admin',
        auditReason: 'Koreksi jam masuk',
      }),
    );
  });

  it('upsert(): a non-manual-source create (csv_import/fingerprint) leaves enteredBy null even with an actor', async () => {
    const { service, model } = makeService(null);

    await service.upsert(
      { ...baseInput, source: AttendanceSource.CSV_IMPORT },
      false,
      actor,
    );

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ enteredBy: null }),
      expect.anything(),
    );
  });

  it('upsert(): a cross-source overwrite sets overwrittenBy to the actor performing it', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'row-1' });
    const { service } = makeService({ source: AttendanceSource.CSV_IMPORT, update });

    await service.upsert(
      { ...baseInput, source: AttendanceSource.FINGERPRINT },
      true,
      actor,
      'Data CSV salah, timpa dengan hasil rekonsiliasi',
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ enteredBy: null, overwrittenBy: 'user-1' }),
      expect.objectContaining({
        actorId: 'user-1',
        actorRole: 'admin',
        auditReason: 'Data CSV salah, timpa dengan hasil rekonsiliasi',
      }),
    );
  });

  it('upsert(): a same-source in-place update is NOT an overwrite — overwrittenBy stays null', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'row-1' });
    const { service } = makeService({ source: AttendanceSource.FINGERPRINT, update });

    await service.upsert(
      { ...baseInput, source: AttendanceSource.FINGERPRINT },
      false,
      actor,
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ overwrittenBy: null }),
      expect.anything(),
    );
  });

  it('createManual(): threads the controller-supplied actor and dto.reason down to upsert/create', async () => {
    const { service, model } = makeService(null);

    await service.createManual(
      {
        employeeId: 'emp-1',
        date: '2026-06-15',
        reason: 'Karyawan lupa absen',
      } as any,
      false,
      actor,
    );

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: AttendanceSource.MANUAL, enteredBy: 'user-1' }),
      expect.objectContaining({ actorId: 'user-1', auditReason: 'Karyawan lupa absen' }),
    );
  });

  it('bulkImportCsv(): threads the controller-supplied actor to every row it upserts', async () => {
    const { service, model } = makeService(null);

    await service.bulkImportCsv(
      [
        { employeeId: 'emp-1', date: '2026-06-15' } as any,
        { employeeId: 'emp-2', date: '2026-06-15' } as any,
      ],
      false,
      actor,
      'Import bulanan dari sistem lama',
    );

    expect(model.create).toHaveBeenCalledTimes(2);
    for (const [, options] of model.create.mock.calls) {
      expect(options).toEqual(
        expect.objectContaining({
          actorId: 'user-1',
          actorRole: 'admin',
          auditReason: 'Import bulanan dari sistem lama',
        }),
      );
    }
  });
});
