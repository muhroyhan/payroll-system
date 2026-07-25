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
