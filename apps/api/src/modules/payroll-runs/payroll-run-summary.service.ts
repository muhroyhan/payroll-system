import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import { Payslip } from '../payslips/entities/payslip.entity';
import { PayrollRun } from './entities/payroll-run.entity';

export interface PayrollRunSummaryTotals {
  employeeCount: number;
  grossPay: number;
  taxableGross: number;
  pph21Amount: number;
  bpjsKesehatanEmployee: number;
  bpjsKesehatanCompany: number;
  bpjsJhtEmployee: number;
  bpjsJhtCompany: number;
  bpjsJpEmployee: number;
  bpjsJpCompany: number;
  bpjsJkkCompany: number;
  bpjsJkmCompany: number;
  netPay: number;
}

export interface PayrollRunDepartmentSummary extends PayrollRunSummaryTotals {
  departmentId: string | null;
  departmentName: string;
}

export interface PayrollRunSummary {
  payrollRunId: string;
  period: string;
  status: PayrollRunStatus;
  totals: PayrollRunSummaryTotals;
  byDepartment: PayrollRunDepartmentSummary[];
}

const ZERO_TOTALS: PayrollRunSummaryTotals = {
  employeeCount: 0,
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
};

type MoneyField = Exclude<keyof PayrollRunSummaryTotals, 'employeeCount'>;

const MONEY_FIELDS: MoneyField[] = [
  'grossPay',
  'taxableGross',
  'pph21Amount',
  'bpjsKesehatanEmployee',
  'bpjsKesehatanCompany',
  'bpjsJhtEmployee',
  'bpjsJhtCompany',
  'bpjsJpEmployee',
  'bpjsJpCompany',
  'bpjsJkkCompany',
  'bpjsJkmCompany',
  'netPay',
];

// P8-T06 — pure aggregation over the FINAL payslips a run already has (P8-T04).
// Never recalculates a single number; §5.8/04_STEPS.md gave no format spec, so
// scope was confirmed with the user: totals per run + breakdown per
// department, JSON + CSV.
@Injectable()
export class PayrollRunSummaryService {
  constructor(
    @InjectModel(PayrollRun)
    private readonly payrollRunModel: typeof PayrollRun,
    @InjectModel(Payslip)
    private readonly payslipModel: typeof Payslip,
  ) {}

  async summarize(payrollRunId: string): Promise<PayrollRunSummary> {
    const run = await this.payrollRunModel.findByPk(payrollRunId);
    if (!run) {
      throw new ConflictException(`Payroll run ${payrollRunId} not found`);
    }
    // A `draft` run has no payslips yet — nothing to summarize.
    if (run.status === PayrollRunStatus.DRAFT) {
      throw new ConflictException(
        `Payroll run ${payrollRunId} is still draft — it has no calculated ` +
          `payslips yet. Run the calculation first (§5.8).`,
      );
    }

    const payslips = await this.payslipModel.findAll({
      where: { payrollRunId },
      include: [
        {
          association: 'employee',
          include: ['department'],
        },
      ],
    });

    const totals = { ...ZERO_TOTALS };
    const byDepartmentMap = new Map<string, PayrollRunDepartmentSummary>();

    for (const payslip of payslips) {
      totals.employeeCount += 1;
      for (const field of MONEY_FIELDS) {
        totals[field] += Number(payslip[field]);
      }

      const department = payslip.employee?.department ?? null;
      const departmentId = department?.id ?? null;
      const departmentName = department?.name ?? 'Tanpa Departemen';
      const key = departmentId ?? '__none__';

      let bucket = byDepartmentMap.get(key);
      if (!bucket) {
        bucket = { ...ZERO_TOTALS, departmentId, departmentName };
        byDepartmentMap.set(key, bucket);
      }
      bucket.employeeCount += 1;
      for (const field of MONEY_FIELDS) {
        bucket[field] += Number(payslip[field]);
      }
    }

    return {
      payrollRunId,
      period: run.period,
      status: run.status,
      totals,
      byDepartment: Array.from(byDepartmentMap.values()).sort((a, b) =>
        a.departmentName.localeCompare(b.departmentName),
      ),
    };
  }
}
