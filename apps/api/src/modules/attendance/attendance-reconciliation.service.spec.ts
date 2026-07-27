import { AttendanceReconciliationService } from './attendance-reconciliation.service';

// Regression guard for the P3-T03 gap: reconcileOne/reconcileRange computed
// the right attendance fields but never threaded the caller's `overwrite`
// flag down to AttendanceRecordsService.upsert, so TC-ATT-07's override path
// was unreachable through the reconciliation API even though upsert() itself
// supported it. attendance-records.service.spec.ts calls upsert() directly
// and would NOT catch this — it never goes through reconciliation at all.
describe('AttendanceReconciliationService — overwrite threading', () => {
  function makeService() {
    const fingerprintModel = { findAll: jest.fn().mockResolvedValue([]) };
    const attendanceRawLogsService = { findForDeviceUserAndDate: jest.fn() };
    const attendanceRecordsService = {
      upsert: jest.fn().mockResolvedValue({ id: 'row-1' }),
    };
    const holidaysService = { list: jest.fn().mockResolvedValue([]) };
    const leaveRequestsService = {
      findApprovedCoveringDate: jest.fn().mockResolvedValue(null),
    };
    const permissionResolver = {
      hasApprovedPermission: jest.fn().mockResolvedValue(false),
    };

    const service = new AttendanceReconciliationService(
      fingerprintModel as any,
      attendanceRawLogsService as any,
      attendanceRecordsService as any,
      holidaysService as any,
      leaveRequestsService as any,
      permissionResolver,
    );

    return { service, attendanceRecordsService };
  }

  it('reconcileOne defaults to overwrite=false when omitted', async () => {
    const { service, attendanceRecordsService } = makeService();
    await service.reconcileOne('emp-1', '2026-06-15');
    expect(attendanceRecordsService.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'emp-1', date: '2026-06-15' }),
      false,
      null,
      undefined,
    );
  });

  it('reconcileOne threads overwrite=true through to upsert', async () => {
    const { service, attendanceRecordsService } = makeService();
    await service.reconcileOne('emp-1', '2026-06-15', true);
    expect(attendanceRecordsService.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'emp-1', date: '2026-06-15' }),
      true,
      null,
      undefined,
    );
  });

  it('reconcileRange threads overwrite=true through to every date in range', async () => {
    const { service, attendanceRecordsService } = makeService();
    await service.reconcileRange('emp-1', '2026-06-15', '2026-06-16', true);

    expect(attendanceRecordsService.upsert).toHaveBeenCalledTimes(2);
    const calls = attendanceRecordsService.upsert.mock.calls as unknown as [
      unknown,
      boolean,
    ][];
    for (const [, overwriteArg] of calls) {
      expect(overwriteArg).toBe(true);
    }
  });

  // Audit-trail follow-up (dispute-traceability review, §D) — reconciliation
  // is the third write path funneling through upsert(); this proves the
  // @CurrentUser() the controller resolves actually reaches upsert(), not
  // just the overwrite flag (the regression this file already guards).
  it('reconcileOne threads the actor and reason through to upsert', async () => {
    const { service, attendanceRecordsService } = makeService();
    const actor = { id: 'user-1', role: 'admin' };

    await service.reconcileOne(
      'emp-1',
      '2026-06-15',
      true,
      actor,
      'Rekonsiliasi ulang setelah koreksi raw log',
    );

    expect(attendanceRecordsService.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'emp-1', date: '2026-06-15' }),
      true,
      actor,
      'Rekonsiliasi ulang setelah koreksi raw log',
    );
  });

  it('reconcileRange threads the same actor and reason to every date in range', async () => {
    const { service, attendanceRecordsService } = makeService();
    const actor = { id: 'user-1', role: 'admin' };

    await service.reconcileRange(
      'emp-1',
      '2026-06-15',
      '2026-06-16',
      true,
      actor,
      'Rekonsiliasi rentang bulan Juni',
    );

    expect(attendanceRecordsService.upsert).toHaveBeenCalledTimes(2);
    const calls = attendanceRecordsService.upsert.mock.calls as unknown as [
      unknown,
      boolean,
      typeof actor,
      string,
    ][];
    for (const [, , actorArg, reasonArg] of calls) {
      expect(actorArg).toEqual(actor);
      expect(reasonArg).toBe('Rekonsiliasi rentang bulan Juni');
    }
  });
});
