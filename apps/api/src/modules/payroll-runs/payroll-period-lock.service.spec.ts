import { ConflictException } from '@nestjs/common';
import { PayrollPeriodLockService } from './payroll-period-lock.service';

describe('PayrollPeriodLockService (P8-T07 / TC-PAYROLL-04)', () => {
  function makeService(count: number) {
    const payrollRunModel = {
      count: jest.fn().mockResolvedValue(count),
    };
    const service = new PayrollPeriodLockService(payrollRunModel as any);
    return { service, payrollRunModel };
  }

  it('reports a period as locked when a non-draft run exists for it', async () => {
    const { service, payrollRunModel } = makeService(1);
    await expect(service.isPeriodLocked('2026-11')).resolves.toBe(true);
    // Only non-draft runs count toward the lock.
    const calls = payrollRunModel.count.mock.calls as Array<
      [{ where: { period: string; status: unknown } }]
    >;
    const whereArg = calls[0][0].where;
    expect(whereArg.period).toBe('2026-11');
    expect(whereArg.status).toBeDefined();
  });

  it('reports a period as unlocked when only a draft run (or none) exists', async () => {
    const { service } = makeService(0);
    await expect(service.isPeriodLocked('2026-11')).resolves.toBe(false);
  });

  it('assertPeriodEditable throws for a locked period', async () => {
    const { service } = makeService(1);
    await expect(service.assertPeriodEditable('2026-11')).rejects.toThrow(
      ConflictException,
    );
  });

  it('assertPeriodEditable passes for an unlocked period', async () => {
    const { service } = makeService(0);
    await expect(
      service.assertPeriodEditable('2026-11'),
    ).resolves.toBeUndefined();
  });
});
