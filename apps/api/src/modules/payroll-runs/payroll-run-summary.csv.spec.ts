import { renderPayrollRunSummaryCsv } from './payroll-run-summary.csv';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import { PayrollRunSummary } from './payroll-run-summary.service';

describe('renderPayrollRunSummaryCsv', () => {
  it('renders one row per department plus a TOTAL row', () => {
    const summary: PayrollRunSummary = {
      payrollRunId: 'run-1',
      period: '2026-11',
      status: PayrollRunStatus.CALCULATED,
      totals: {
        employeeCount: 2,
        grossPay: 21000000,
        taxableGross: 21000000,
        pph21Amount: 640000,
        bpjsKesehatanEmployee: 80000,
        bpjsKesehatanCompany: 320000,
        bpjsJhtEmployee: 210000,
        bpjsJhtCompany: 777000,
        bpjsJpEmployee: 210000,
        bpjsJpCompany: 420000,
        bpjsJkkCompany: 21000,
        bpjsJkmCompany: 6300,
        netPay: 19720000,
      },
      byDepartment: [
        {
          departmentId: 'dept-1',
          departmentName: 'Engineering',
          employeeCount: 1,
          grossPay: 8000000,
          taxableGross: 8000000,
          pph21Amount: 120000,
          bpjsKesehatanEmployee: 32000,
          bpjsKesehatanCompany: 128000,
          bpjsJhtEmployee: 80000,
          bpjsJhtCompany: 296000,
          bpjsJpEmployee: 80000,
          bpjsJpCompany: 160000,
          bpjsJkkCompany: 8000,
          bpjsJkmCompany: 2400,
          netPay: 7560000,
        },
      ],
    };

    const csv = renderPayrollRunSummaryCsv(summary);
    const lines = csv.trim().split('\n');

    expect(lines[0]).toBe(
      'department,employee_count,gross_pay,taxable_gross,pph21_amount,bpjs_kesehatan_employee,bpjs_kesehatan_company,bpjs_jht_employee,bpjs_jht_company,bpjs_jp_employee,bpjs_jp_company,bpjs_jkk_company,bpjs_jkm_company,net_pay',
    );
    expect(lines[1]).toBe(
      'Engineering,1,8000000,8000000,120000,32000,128000,80000,296000,80000,160000,8000,2400,7560000',
    );
    expect(lines[2]).toBe(
      'TOTAL,2,21000000,21000000,640000,80000,320000,210000,777000,210000,420000,21000,6300,19720000',
    );
    expect(lines).toHaveLength(3);
  });

  it('quotes department names containing a comma', () => {
    const summary: PayrollRunSummary = {
      payrollRunId: 'run-1',
      period: '2026-11',
      status: PayrollRunStatus.CALCULATED,
      totals: {
        employeeCount: 1,
        grossPay: 0,
        taxableGross: 0,
        pph21Amount: 0,
        bpjsKesehatanEmployee: 0,
        bpjsKesehatanCompany: 0,
        bpjsJhtEmployee: 0,
        bpjsJhtCompany: 0,
        bpjsJpEmployee: 0,
        bpjsJpCompany: 0,
        bpjsJkkCompany: 0,
        bpjsJkmCompany: 0,
        netPay: 0,
      },
      byDepartment: [
        {
          departmentId: 'dept-1',
          departmentName: 'Sales, Marketing',
          employeeCount: 1,
          grossPay: 0,
          taxableGross: 0,
          pph21Amount: 0,
          bpjsKesehatanEmployee: 0,
          bpjsKesehatanCompany: 0,
          bpjsJhtEmployee: 0,
          bpjsJhtCompany: 0,
          bpjsJpEmployee: 0,
          bpjsJpCompany: 0,
          bpjsJkkCompany: 0,
          bpjsJkmCompany: 0,
          netPay: 0,
        },
      ],
    };

    const csv = renderPayrollRunSummaryCsv(summary);
    expect(csv).toContain('"Sales, Marketing"');
  });
});
