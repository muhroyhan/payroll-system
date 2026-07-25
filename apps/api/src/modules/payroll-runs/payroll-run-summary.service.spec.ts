import { ConflictException } from '@nestjs/common';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import { PayrollRunSummaryService } from './payroll-run-summary.service';

describe('PayrollRunSummaryService (P8-T06)', () => {
  function payslip(overrides: Record<string, unknown>) {
    return {
      grossPay: '0.00',
      taxableGross: '0.00',
      pph21Amount: '0.00',
      bpjsKesehatanEmployee: '0.00',
      bpjsKesehatanCompany: '0.00',
      bpjsJhtEmployee: '0.00',
      bpjsJhtCompany: '0.00',
      bpjsJpEmployee: '0.00',
      bpjsJpCompany: '0.00',
      bpjsJkkCompany: '0.00',
      bpjsJkmCompany: '0.00',
      netPay: '0.00',
      employee: { department: { id: 'dept-1', name: 'Engineering' } },
      ...overrides,
    };
  }

  function makeService(
    run: { status: PayrollRunStatus } | null,
    payslips: unknown[],
  ) {
    const payrollRunModel = {
      findByPk: jest.fn().mockResolvedValue(run),
    };
    const payslipModel = {
      findAll: jest.fn().mockResolvedValue(payslips),
    };
    const service = new PayrollRunSummaryService(
      payrollRunModel as any,
      payslipModel as any,
    );
    return { service, payrollRunModel, payslipModel };
  }

  it('rejects a draft run — nothing to summarize yet', async () => {
    const { service } = makeService({ status: PayrollRunStatus.DRAFT }, []);
    await expect(service.summarize('run-1')).rejects.toThrow(ConflictException);
  });

  it('rejects an unknown run', async () => {
    const { service } = makeService(null, []);
    await expect(service.summarize('run-1')).rejects.toThrow(ConflictException);
  });

  it('aggregates totals across all payslips for a calculated run', async () => {
    const { service } = makeService(
      { status: PayrollRunStatus.CALCULATED, period: '2026-11' } as any,
      [
        payslip({
          grossPay: '8000000.00',
          taxableGross: '8000000.00',
          pph21Amount: '120000.00',
          netPay: '7560000.00',
          employee: { department: { id: 'dept-1', name: 'Engineering' } },
        }),
        payslip({
          grossPay: '13000000.00',
          taxableGross: '13000000.00',
          pph21Amount: '520000.00',
          netPay: '12160000.00',
          employee: { department: { id: 'dept-2', name: 'Finance' } },
        }),
      ],
    );

    const summary = await service.summarize('run-1');

    expect(summary.totals.employeeCount).toBe(2);
    expect(summary.totals.grossPay).toBe(21000000);
    expect(summary.totals.pph21Amount).toBe(640000);
    expect(summary.totals.netPay).toBe(19720000);
    expect(summary.byDepartment).toHaveLength(2);
    const eng = summary.byDepartment.find(
      (d) => d.departmentName === 'Engineering',
    );
    expect(eng?.grossPay).toBe(8000000);
    expect(eng?.employeeCount).toBe(1);
  });

  it('groups employees with no department under "Tanpa Departemen"', async () => {
    const { service } = makeService(
      { status: PayrollRunStatus.APPROVED, period: '2026-11' } as any,
      [payslip({ employee: { department: null } })],
    );

    const summary = await service.summarize('run-1');

    expect(summary.byDepartment).toHaveLength(1);
    expect(summary.byDepartment[0].departmentName).toBe('Tanpa Departemen');
    expect(summary.byDepartment[0].departmentId).toBeNull();
  });

  it('accepts a disbursed run (past approved is still summarizable)', async () => {
    const { service } = makeService(
      { status: PayrollRunStatus.DISBURSED, period: '2026-11' } as any,
      [payslip({})],
    );

    await expect(service.summarize('run-1')).resolves.toBeDefined();
  });
});
