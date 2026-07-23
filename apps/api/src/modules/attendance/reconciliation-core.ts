import { ScanType } from '@payroll-system/shared-types';

// §4 — fixed work-hours assumption for this project (no shift work / rotating
// schedules support), not an admin-editable constant, so it lives here rather
// than in a masters table.
export const STANDARD_WORK_END_HOUR = 17;

export interface RawScan {
  scanTime: Date;
  scanType: ScanType | null;
}

export interface ExternalSignals {
  isHoliday: boolean;
  isOnLeave: boolean;
  hasPermission: boolean;
}

export interface ReconciledDay {
  clockIn: Date | null;
  clockOut: Date | null;
  overtimeHours: number;
  hasMissedClockOut: boolean;
  isHoliday: boolean;
  isOnLeave: boolean;
  hasPermission: boolean;
}

/**
 * Pure core: turns one employee/day's raw scans + precomputed holiday/leave/
 * permission signals into the fields attendance_records stores. No I/O — the
 * DB-backed service does all fetching and calls this. Covers TC-ATT-01..06;
 * TC-ATT-07 (source conflict) is a service-layer concern, not this function's.
 */
export function reconcileDay(
  scans: RawScan[],
  signals: ExternalSignals,
): ReconciledDay {
  const sorted = [...scans].sort(
    (a, b) => a.scanTime.getTime() - b.scanTime.getTime(),
  );

  const base = {
    isHoliday: signals.isHoliday,
    isOnLeave: signals.isOnLeave,
    hasPermission: signals.hasPermission,
  };

  if (sorted.length === 0) {
    return {
      clockIn: null,
      clockOut: null,
      overtimeHours: 0,
      hasMissedClockOut: false,
      ...base,
    };
  }

  if (sorted.length === 1) {
    // TC-ATT-02 — a single scan is an incomplete day, never a full/zero day.
    // If the device tagged it 'out', treat it as a missed clock-IN instead of
    // guessing it's a clock-in; otherwise (untyped or 'in') assume clock-in.
    const only = sorted[0];
    if (only.scanType === ScanType.OUT) {
      return {
        clockIn: null,
        clockOut: only.scanTime,
        overtimeHours: 0,
        hasMissedClockOut: true,
        ...base,
      };
    }
    return {
      clockIn: only.scanTime,
      clockOut: null,
      overtimeHours: 0,
      hasMissedClockOut: true,
      ...base,
    };
  }

  const hasTypedScans = sorted.some((s) => s.scanType !== null);
  let clockIn: Date;
  let clockOut: Date;

  if (hasTypedScans) {
    const firstIn = sorted.find((s) => s.scanType === ScanType.IN);
    const lastOut = [...sorted]
      .reverse()
      .find((s) => s.scanType === ScanType.OUT);
    clockIn = (firstIn ?? sorted[0]).scanTime;
    clockOut = (lastOut ?? sorted[sorted.length - 1]).scanTime;
  } else {
    // §5.3 — no scan_type reported at all: infer in/out from scan order.
    clockIn = sorted[0].scanTime;
    clockOut = sorted[sorted.length - 1].scanTime;
  }

  const overtimeHours = computeOvertimeHours(clockOut);

  return {
    clockIn,
    clockOut,
    overtimeHours,
    hasMissedClockOut: false,
    ...base,
  };
}

function computeOvertimeHours(clockOut: Date): number {
  const standardEnd = new Date(clockOut);
  standardEnd.setHours(STANDARD_WORK_END_HOUR, 0, 0, 0);
  if (clockOut <= standardEnd) {
    return 0;
  }
  const diffMs = clockOut.getTime() - standardEnd.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}
