import { Op } from 'sequelize';
import { PtkpStatus } from '@payroll-system/shared-types';
import { EffectiveRangePayslipChecker } from './effective-range-payslip-checker';

describe('EffectiveRangePayslipChecker', () => {
  function make(runs: Array<{ id: string; period: string }>, payslips: Array<{ employee: { ptkpStatus: PtkpStatus } }> = []) {
    const payrollRunModel = { findAll: jest.fn().mockResolvedValue(runs) };
    const payslipModel = { findAll: jest.fn().mockResolvedValue(payslips) };
    const checker = new EffectiveRangePayslipChecker(
      payrollRunModel as any,
      payslipModel as any,
    );
    return { checker, payrollRunModel, payslipModel };
  }

  it('returns false when no payroll run has any payslip', async () => {
    const { checker, payslipModel } = make([]);

    await expect(
      checker.isReferenced({
        effectiveStartDate: '2026-01-01',
        effectiveEndDate: null,
      }),
    ).resolves.toBe(false);
    expect(payslipModel.findAll).not.toHaveBeenCalled();
  });

  it('returns false when every run-with-payslips falls outside the effective range', async () => {
    const { checker } = make([{ id: 'run-1', period: '2025-06' }]);

    await expect(
      checker.isReferenced({
        effectiveStartDate: '2026-01-01',
        effectiveEndDate: null,
      }),
    ).resolves.toBe(false);
  });

  it('returns true when a run-with-payslips falls in range and no category filter is given (e.g. BPJS rate cards)', async () => {
    const { checker } = make([{ id: 'run-1', period: '2026-03' }]);

    await expect(
      checker.isReferenced({
        effectiveStartDate: '2026-01-01',
        effectiveEndDate: null,
      }),
    ).resolves.toBe(true);
  });

  it('respects an open-ended (null) effectiveEndDate on the run side too', async () => {
    const { checker } = make([{ id: 'run-1', period: '2026-01' }]);

    await expect(
      checker.isReferenced({
        effectiveStartDate: '2025-01-01',
        effectiveEndDate: '2025-12-31',
      }),
    ).resolves.toBe(false);
  });

  it('with a category filter (e.g. ptkp_master), returns false if no matching-category payslip exists in range', async () => {
    const { checker, payslipModel } = make(
      [{ id: 'run-1', period: '2026-03' }],
      [{ employee: { ptkpStatus: PtkpStatus.TK_0 } }],
    );

    const referenced = await checker.isReferenced(
      { effectiveStartDate: '2026-01-01', effectiveEndDate: null },
      (employee) => employee.ptkpStatus === PtkpStatus.K_1,
    );

    expect(referenced).toBe(false);
    expect(payslipModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { payrollRunId: { [Op.in]: ['run-1'] } },
      }),
    );
  });

  it('with a category filter, returns true when a matching-category payslip exists in range', async () => {
    const { checker } = make(
      [{ id: 'run-1', period: '2026-03' }],
      [{ employee: { ptkpStatus: PtkpStatus.K_1 } }],
    );

    await expect(
      checker.isReferenced(
        { effectiveStartDate: '2026-01-01', effectiveEndDate: null },
        (employee) => employee.ptkpStatus === PtkpStatus.K_1,
      ),
    ).resolves.toBe(true);
  });

  it('only queries payslips for runs that actually fall in range (candidate narrowing)', async () => {
    const { checker, payslipModel } = make([
      { id: 'run-out', period: '2025-01' },
      { id: 'run-in', period: '2026-05' },
    ]);

    await checker.isReferenced(
      { effectiveStartDate: '2026-01-01', effectiveEndDate: null },
      () => true,
    );

    expect(payslipModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { payrollRunId: { [Op.in]: ['run-in'] } },
      }),
    );
  });
});
