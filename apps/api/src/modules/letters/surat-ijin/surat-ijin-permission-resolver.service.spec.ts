import { SuratIjinPermissionResolver } from './surat-ijin-permission-resolver.service';

// P4-T04 — the real PermissionResolver implementation swapped in for
// NoPermissionResolver (P3-T03 stub). AttendanceReconciliationService only
// ever calls hasApprovedPermission(); this proves it correctly reflects
// whether an approved surat_ijin exists for that employee/date (TC-ATT-05).
describe('SuratIjinPermissionResolver', () => {
  function makeResolver(approvedRecord: unknown) {
    const suratIjinService = {
      findApprovedForDate: jest.fn().mockResolvedValue(approvedRecord),
    };
    const resolver = new SuratIjinPermissionResolver(suratIjinService as any);
    return { resolver, suratIjinService };
  }

  it('returns true when an approved surat_ijin exists for that employee/date', async () => {
    const { resolver, suratIjinService } = makeResolver({ id: 'si-1' });

    const result = await resolver.hasApprovedPermission('emp-1', '2026-07-23');

    expect(result).toBe(true);
    expect(suratIjinService.findApprovedForDate).toHaveBeenCalledWith(
      'emp-1',
      '2026-07-23',
    );
  });

  it('returns false when there is no approved surat_ijin for that employee/date', async () => {
    const { resolver } = makeResolver(null);

    const result = await resolver.hasApprovedPermission('emp-1', '2026-07-23');

    expect(result).toBe(false);
  });
});
