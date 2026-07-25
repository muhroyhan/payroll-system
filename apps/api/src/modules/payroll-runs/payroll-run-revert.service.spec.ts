import { PayrollRunRevertService } from './payroll-run-revert.service';

describe('PayrollRunRevertService (P8-T07)', () => {
  function makeService(payslipIds: string[]) {
    const payslipModel = {
      findAll: jest.fn().mockResolvedValue(payslipIds.map((id) => ({ id }))),
      destroy: jest.fn().mockResolvedValue(payslipIds.length),
    };
    const lineItemModel = {
      destroy: jest.fn().mockResolvedValue(payslipIds.length * 3),
    };
    const kasbonService = {
      reverseInstallmentsForRun: jest.fn().mockResolvedValue(2),
    };
    const service = new PayrollRunRevertService(
      payslipModel as any,
      lineItemModel as any,
      kasbonService as any,
    );
    return { service, payslipModel, lineItemModel, kasbonService };
  }

  it('deletes line items, then payslips, then reverses kasbon deductions', async () => {
    const { service, payslipModel, lineItemModel, kasbonService } = makeService(
      ['ps-1', 'ps-2'],
    );

    const result = await service.revertRunData('run-1', 'txn' as any);

    // line items deleted by payslip id, payslips deleted, kasbon reversed.
    expect(lineItemModel.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: 'txn' }),
    );
    expect(payslipModel.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: 'txn' }),
    );
    expect(kasbonService.reverseInstallmentsForRun).toHaveBeenCalledWith(
      'run-1',
      'txn',
    );
    expect(result).toEqual({
      deletedPayslips: 2,
      deletedLineItems: 6,
      reversedKasbonDeductions: 2,
    });
  });

  it('skips payslip/line-item deletion when the run has none, still reverses kasbon', async () => {
    const { service, payslipModel, lineItemModel, kasbonService } = makeService(
      [],
    );

    const result = await service.revertRunData('run-1', 'txn' as any);

    expect(lineItemModel.destroy).not.toHaveBeenCalled();
    expect(payslipModel.destroy).not.toHaveBeenCalled();
    // Kasbon reversal still runs — a deduction could exist even if a race left
    // no payslip (defensive; the transaction keeps it consistent).
    expect(kasbonService.reverseInstallmentsForRun).toHaveBeenCalledWith(
      'run-1',
      'txn',
    );
    expect(result.deletedPayslips).toBe(0);
    expect(result.deletedLineItems).toBe(0);
  });
});
