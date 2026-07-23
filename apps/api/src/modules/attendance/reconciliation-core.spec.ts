import { ScanType } from '@payroll-system/shared-types';
import { reconcileDay } from './reconciliation-core';

// TC-ATT-01..06 (§12.3). TC-ATT-07 (source conflict) is a service-layer
// concern, covered in attendance-records.service.spec.ts instead.

const NO_SIGNALS = { isHoliday: false, isOnLeave: false, hasPermission: false };

function scan(time: string, scanType: ScanType | null = null) {
  return { scanTime: new Date(time), scanType };
}

describe('reconcileDay (TC-ATT)', () => {
  it('TC-ATT-01: two scans (in/out) on a normal day -> correct clock_in/clock_out', () => {
    const result = reconcileDay(
      [scan('2026-06-01T08:00:00'), scan('2026-06-01T17:00:00')],
      NO_SIGNALS,
    );
    expect(result.clockIn).toEqual(new Date('2026-06-01T08:00:00'));
    expect(result.clockOut).toEqual(new Date('2026-06-01T17:00:00'));
    expect(result.hasMissedClockOut).toBe(false);
    expect(result.overtimeHours).toBe(0);
  });

  it('TC-ATT-01 (typed, out of order): scan_type present resolves first-in/last-out regardless of array order', () => {
    const result = reconcileDay(
      [
        scan('2026-06-01T17:00:00', ScanType.OUT),
        scan('2026-06-01T08:00:00', ScanType.IN),
      ],
      NO_SIGNALS,
    );
    expect(result.clockIn).toEqual(new Date('2026-06-01T08:00:00'));
    expect(result.clockOut).toEqual(new Date('2026-06-01T17:00:00'));
  });

  it('TC-ATT-02: only one raw scan -> flagged, not treated as a full or zero day', () => {
    const result = reconcileDay([scan('2026-06-02T08:05:00')], NO_SIGNALS);
    expect(result.clockIn).toEqual(new Date('2026-06-02T08:05:00'));
    expect(result.clockOut).toBeNull();
    expect(result.hasMissedClockOut).toBe(true);
  });

  it('TC-ATT-02 (typed single "out" scan): treated as a missed clock-IN, not fabricated as a clock-in', () => {
    const result = reconcileDay(
      [scan('2026-06-02T17:00:00', ScanType.OUT)],
      NO_SIGNALS,
    );
    expect(result.clockIn).toBeNull();
    expect(result.clockOut).toEqual(new Date('2026-06-02T17:00:00'));
    expect(result.hasMissedClockOut).toBe(true);
  });

  it('no scans at all is distinct from a missed clock-out (e.g. a plain absence)', () => {
    const result = reconcileDay([], NO_SIGNALS);
    expect(result.clockIn).toBeNull();
    expect(result.clockOut).toBeNull();
    expect(result.hasMissedClockOut).toBe(false);
  });

  it('TC-ATT-03: is_holiday passes through untouched regardless of scans', () => {
    const result = reconcileDay([], { ...NO_SIGNALS, isHoliday: true });
    expect(result.isHoliday).toBe(true);
  });

  it('TC-ATT-04: is_on_leave passes through untouched', () => {
    const result = reconcileDay([], { ...NO_SIGNALS, isOnLeave: true });
    expect(result.isOnLeave).toBe(true);
  });

  it('TC-ATT-05: has_permission passes through untouched (source wiring is Phase 4/P4-T04)', () => {
    const result = reconcileDay([scan('2026-06-01T09:30:00')], {
      ...NO_SIGNALS,
      hasPermission: true,
    });
    expect(result.hasPermission).toBe(true);
    // A late arrival with permission is still flagged incomplete if it's the
    // only scan — has_permission and hasMissedClockOut are independent flags.
    expect(result.hasMissedClockOut).toBe(true);
  });

  it('TC-ATT-06: holiday and approved leave overlap -> both flags true, no conflict', () => {
    const result = reconcileDay([], {
      isHoliday: true,
      isOnLeave: true,
      hasPermission: false,
    });
    expect(result.isHoliday).toBe(true);
    expect(result.isOnLeave).toBe(true);
  });

  it('overtime: clock_out after the standard 17:00 end produces positive overtimeHours', () => {
    const result = reconcileDay(
      [scan('2026-06-01T08:00:00'), scan('2026-06-01T19:15:00')],
      NO_SIGNALS,
    );
    expect(result.overtimeHours).toBe(2.25);
  });

  it('overtime: clock_out at/before 17:00 produces zero overtimeHours', () => {
    const result = reconcileDay(
      [scan('2026-06-01T08:00:00'), scan('2026-06-01T16:45:00')],
      NO_SIGNALS,
    );
    expect(result.overtimeHours).toBe(0);
  });

  it('untyped scans (device reports no scan_type) infer clock_in/clock_out from order', () => {
    const result = reconcileDay(
      [
        scan('2026-06-01T12:00:00'), // a mid-day scan with no type
        scan('2026-06-01T08:00:00'),
        scan('2026-06-01T17:00:00'),
      ],
      NO_SIGNALS,
    );
    expect(result.clockIn).toEqual(new Date('2026-06-01T08:00:00'));
    expect(result.clockOut).toEqual(new Date('2026-06-01T17:00:00'));
  });
});
