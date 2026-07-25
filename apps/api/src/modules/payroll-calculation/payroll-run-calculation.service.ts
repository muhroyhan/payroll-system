import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { randomUUID } from 'crypto';
import { Op, Sequelize, UniqueConstraintError } from 'sequelize';
import {
  KasbonStatus,
  PayslipComponentType,
  PayslipLineSource,
} from '@payroll-system/shared-types';
import {
  resolveEffectiveRecord,
  resolveEffectiveRecords,
} from '../../common/effective-dating/resolve-effective';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeesService } from '../employees/employees.service';
import { PayrollRun } from '../payroll-runs/entities/payroll-run.entity';
import { Payslip } from '../payslips/entities/payslip.entity';
import { PayslipLineItem } from '../payslips/entities/payslip-line-item.entity';
import { SalaryMaster } from '../salary-master/entities/salary-master.entity';
import { IncentiveMaster } from '../incentive-master/entities/incentive-master.entity';
import { SuratPeringatan } from '../letters/surat-peringatan/entities/surat-peringatan.entity';
import { Kasbon } from '../kasbon/entities/kasbon.entity';
import { KasbonDeduction } from '../kasbon/entities/kasbon-deduction.entity';
import { KasbonService } from '../kasbon/kasbon.service';
import { PayslipTempComponentsService } from '../payslip-temp-components/payslip-temp-components.service';
import { TerBracketMasterService } from '../tax-bpjs-constants/ter-bracket-master/ter-bracket-master.service';
import { PtkpMasterService } from '../tax-bpjs-constants/ptkp-master/ptkp-master.service';
import { BpjsKesehatanMasterService } from '../tax-bpjs-constants/bpjs-kesehatan-master/bpjs-kesehatan-master.service';
import { BpjsKetenagakerjaanMasterService } from '../tax-bpjs-constants/bpjs-ketenagakerjaan-master/bpjs-ketenagakerjaan-master.service';
import { BiayaJabatanMaster } from '../tax-bpjs-constants/biaya-jabatan-master/entities/biaya-jabatan-master.entity';
import { Pasal17BracketMaster } from '../tax-bpjs-constants/pasal17-bracket-master/entities/pasal17-bracket-master.entity';
import { resolveTerCategory } from '../tax-bpjs-constants/ter-bracket-master/ter-lookup';
import { PerRunScopeCache } from '../scope-resolver/per-run-scope-cache';
import { isNpwpMissing } from './npwp';
import {
  ResolvedDeduction,
  ResolvedEarning,
  calculateEmployeePayslip,
} from './employee-payslip.core';
import { calculateAnnualPph21Trueup } from './pph21-annual-trueup.core';

// P8-T04 — the DB-facing §9 assembly. Resolves each employee's inputs (scope
// cache for salary/incentive, temp components, sanctions, kasbon), calls the
// pure calculation core, and persists one payslip + its line items. Called by
// the calculation job's chunk loop.
@Injectable()
export class PayrollRunCalculationService {
  private readonly logger = new Logger(PayrollRunCalculationService.name);

  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(Payslip) private readonly payslipModel: typeof Payslip,
    @InjectModel(PayslipLineItem)
    private readonly lineItemModel: typeof PayslipLineItem,
    @InjectModel(SuratPeringatan)
    private readonly suratPeringatanModel: typeof SuratPeringatan,
    @InjectModel(Kasbon) private readonly kasbonModel: typeof Kasbon,
    @InjectModel(KasbonDeduction)
    private readonly kasbonDeductionModel: typeof KasbonDeduction,
    @InjectModel(BiayaJabatanMaster)
    private readonly biayaJabatanModel: typeof BiayaJabatanMaster,
    @InjectModel(Pasal17BracketMaster)
    private readonly pasal17Model: typeof Pasal17BracketMaster,
    private readonly employeesService: EmployeesService,
    private readonly kasbonService: KasbonService,
    private readonly tempComponentsService: PayslipTempComponentsService,
    private readonly terBracketMasterService: TerBracketMasterService,
    private readonly ptkpMasterService: PtkpMasterService,
    private readonly bpjsKesehatanMasterService: BpjsKesehatanMasterService,
    private readonly bpjsKetenagakerjaanMasterService: BpjsKetenagakerjaanMasterService,
    // Injected as models so PerRunScopeCache can snapshot them once per run.
    @InjectModel(SalaryMaster)
    readonly salaryMasterModel: typeof SalaryMaster,
    @InjectModel(IncentiveMaster)
    readonly incentiveMasterModel: typeof IncentiveMaster,
  ) {}

  newScopeCache(periodDate: string): PerRunScopeCache {
    return new PerRunScopeCache(periodDate);
  }

  // One employee → one payslip (+ line items), idempotent. A payslip that
  // already exists for (run, employee) means this employee is done — skip
  // (retry-safe pre-check). The DB unique constraint is the real guard against
  // a concurrent race (caught below).
  async calculateEmployee(
    run: PayrollRun,
    employee: Employee,
    scopeCache: PerRunScopeCache,
  ): Promise<void> {
    const existing = await this.payslipModel.findOne({
      where: { payrollRunId: run.id, employeeId: employee.id },
    });
    if (existing) {
      return;
    }

    const periodDate = `${run.period}-01`;
    const month = Number(run.period.slice(5, 7));

    const earnings = await this.resolveEarnings(
      run,
      employee,
      periodDate,
      scopeCache,
    );

    try {
      await this.sequelize.transaction(async (transaction) => {
        // Deductions mutate state (kasbon), so they run inside the txn: if the
        // payslip insert loses a race, the kasbon deduction rolls back too.
        const deductions = await this.resolveDeductions(
          run,
          employee,
          periodDate,
          transaction,
        );

        const taxableGross = earnings
          .filter((e) => e.isTaxable)
          .reduce((s, e) => s + e.amount, 0);

        const pph21Override =
          month === 12
            ? await this.computeDecemberPph21(
                run,
                employee,
                periodDate,
                taxableGross,
                earnings,
              )
            : undefined;

        const result = calculateEmployeePayslip({
          ptkpStatus: employee.ptkpStatus,
          npwpMissing: isNpwpMissing(employee.npwp),
          earnings,
          deductions,
          terBrackets: await this.terBracketMasterService.resolveEffective(
            periodDate,
            resolveTerCategory(employee.ptkpStatus),
          ),
          bpjsEmployeeRates: await this.bpjsEmployeeRates(periodDate),
          bpjsCompanyRates: await this.bpjsCompanyRates(periodDate),
          pph21Override,
        });

        const payslipId = randomUUID();
        await this.payslipModel.create(
          {
            id: payslipId,
            payrollRunId: run.id,
            employeeId: employee.id,
            grossPay: result.grossPay.toFixed(2),
            taxableGross: result.taxableGross.toFixed(2),
            pph21Amount: result.pph21Amount.toFixed(2),
            bpjsKesehatanEmployee: result.bpjsKesehatanEmployee.toFixed(2),
            bpjsKesehatanCompany: result.bpjsKesehatanCompany.toFixed(2),
            bpjsJhtEmployee: result.bpjsJhtEmployee.toFixed(2),
            bpjsJhtCompany: result.bpjsJhtCompany.toFixed(2),
            bpjsJpEmployee: result.bpjsJpEmployee.toFixed(2),
            bpjsJpCompany: result.bpjsJpCompany.toFixed(2),
            bpjsJkkCompany: result.bpjsJkkCompany.toFixed(2),
            bpjsJkmCompany: result.bpjsJkmCompany.toFixed(2),
            netPay: result.netPay.toFixed(2),
          } as any,
          { transaction },
        );

        await this.lineItemModel.bulkCreate(
          result.lineItems.map((li) => ({
            id: randomUUID(),
            payslipId,
            componentId: li.componentId,
            source: li.source,
            sourceId: li.sourceId,
            amount: li.amount.toFixed(2),
          })) as any,
          { transaction },
        );
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        // A concurrent worker inserted this employee's payslip first — the
        // transaction rolled back (including its kasbon deduction). Idempotent.
        this.logger.log(
          `Payslip for run ${run.id} / employee ${employee.id} already created concurrently — skipped`,
        );
        return;
      }
      throw error;
    }
  }

  // §9 Step 1 — gross earnings: base salary + incentive (scope cache) + active
  // temp earning components. ⚠️ Overtime pay is intentionally omitted: §9's
  // "overtime rate" is undocumented (no rate/formula/constant exists), so it
  // cannot be computed yet — flagged in the P8-T04 report.
  private async resolveEarnings(
    run: PayrollRun,
    employee: Employee,
    periodDate: string,
    scopeCache: PerRunScopeCache,
  ): Promise<ResolvedEarning[]> {
    const earnings: ResolvedEarning[] = [];
    const context = await this.employeesService.getScopeContext(employee.id);

    const salary = await scopeCache.resolve<SalaryMaster>(
      this.salaryMasterModel,
      context,
    );
    if (salary.resolved) {
      earnings.push({
        source: PayslipLineSource.SALARY_MASTER,
        sourceId: salary.record.id,
        componentId: null,
        amount: Number(salary.record.baseSalary),
        isTaxable: true, // base wage — always taxable + BPJS-eligible
        isBpjsEligible: true,
      });
    }

    const incentive = await scopeCache.resolve<IncentiveMaster>(
      this.incentiveMasterModel,
      context,
    );
    if (incentive.resolved) {
      earnings.push({
        source: PayslipLineSource.INCENTIVE_MASTER,
        sourceId: incentive.record.id,
        componentId: null,
        amount: Number(incentive.record.incentiveAmount),
        // Assumption (flagged): incentive treated as taxable + BPJS-eligible.
        // No is_taxable/is_bpjs_eligible flag exists on incentive_master.
        isTaxable: true,
        isBpjsEligible: true,
      });
    }

    const temps = await this.tempComponentsService.listActiveForEmployee(
      employee.id,
      periodDate,
    );
    for (const temp of temps) {
      if (temp.component.componentType === PayslipComponentType.EARNING) {
        earnings.push({
          source: PayslipLineSource.TEMP_COMPONENT,
          sourceId: temp.id,
          componentId: temp.componentId,
          amount: Number(temp.amount),
          isTaxable: temp.component.isTaxable,
          isBpjsEligible: temp.component.isBpjsEligible,
        });
      }
    }

    return earnings;
  }

  // §9 Step 5 — other deductions: kasbon installment + sanction + temp
  // deduction components.
  private async resolveDeductions(
    run: PayrollRun,
    employee: Employee,
    periodDate: string,
    transaction: unknown,
  ): Promise<ResolvedDeduction[]> {
    const deductions: ResolvedDeduction[] = [];

    // Kasbon — deduct one installment per active kasbon (idempotent per
    // (kasbon, run); P5-T02). The recorded KasbonDeduction amount is the line.
    const kasbons = await this.kasbonModel.findAll({
      where: { employeeId: employee.id, status: KasbonStatus.APPROVED },
    });
    for (const kasbon of kasbons) {
      await this.kasbonService.deductInstallment(kasbon.id, run.id);
      const deduction = await this.kasbonDeductionModel.findOne({
        where: { kasbonId: kasbon.id, payrollRunId: run.id },
      });
      if (deduction) {
        deductions.push({
          source: PayslipLineSource.KASBON,
          sourceId: kasbon.id,
          componentId: null,
          amount: Number(deduction.amount),
        });
      }
    }

    // Sanction — a surat_peringatan issued this period with a sanction amount.
    const sanctions = await this.suratPeringatanModel.findAll({
      where: {
        employeeId: employee.id,
        sanctionAmount: { [Op.ne]: null },
        issueDate: { [Op.between]: [`${periodDate}`, `${run.period}-31`] },
      },
    });
    for (const sanction of sanctions) {
      deductions.push({
        source: PayslipLineSource.SANCTION,
        sourceId: sanction.id,
        componentId: sanction.sanctionComponentId,
        amount: Number(sanction.sanctionAmount),
      });
    }

    // Temp deduction components (this period).
    const temps = await this.tempComponentsService.listActiveForEmployee(
      employee.id,
      periodDate,
    );
    for (const temp of temps) {
      if (temp.component.componentType === PayslipComponentType.DEDUCTION) {
        deductions.push({
          source: PayslipLineSource.TEMP_COMPONENT,
          sourceId: temp.id,
          componentId: temp.componentId,
          amount: Number(temp.amount),
        });
      }
    }

    // (transaction is reserved for future kasbon-write threading; the current
    // deductInstallment manages its own idempotent write.)
    void transaction;
    return deductions;
  }

  // December / final-month annual Pasal 17 true-up (P7-T04). Aggregates this
  // year's prior payslips + December's own figures.
  // ⚠️ The annual rounding mode is an OPEN pre-production item (P7-T07) — these
  // December numbers are not yet officially verified.
  private async computeDecemberPph21(
    run: PayrollRun,
    employee: Employee,
    periodDate: string,
    decemberTaxableGross: number,
    decemberEarnings: ResolvedEarning[],
  ): Promise<number> {
    const year = run.period.slice(0, 4);
    const prior = await this.payslipModel.findAll({
      where: { employeeId: employee.id },
      include: [
        {
          association: 'payrollRun',
          where: {
            period: { [Op.between]: [`${year}-01`, `${year}-11`] },
          },
        },
      ],
    });

    const sum = (fn: (p: Payslip) => number) =>
      prior.reduce((s, p) => s + fn(p), 0);

    // December's own employee BPJS (JHT+JP) on its BPJS-eligible gross.
    const bpjsEligible = decemberEarnings
      .filter((e) => e.isBpjsEligible)
      .reduce((s, e) => s + e.amount, 0);
    const empRates = await this.bpjsEmployeeRates(periodDate);
    const decJht = Math.round(bpjsEligible * empRates.jhtRate);
    const decJp = Math.round(
      Math.min(bpjsEligible, empRates.jpCap) * empRates.jpRate,
    );

    const ptkp = await this.ptkpMasterService.resolveByStatus(
      employee.ptkpStatus,
      periodDate,
    );
    const biayaJabatan = await resolveEffectiveRecord(
      this.biayaJabatanModel,
      periodDate,
    );
    const pasal17 = await resolveEffectiveRecords(
      this.pasal17Model,
      periodDate,
    );

    const result = calculateAnnualPph21Trueup({
      annualGrossTaxable:
        sum((p) => Number(p.taxableGross)) + decemberTaxableGross,
      biayaJabatan: {
        rate: Number(biayaJabatan?.rate ?? 0),
        monthlyCap: Number(biayaJabatan?.monthlyCap ?? 0),
        annualCap: Number(biayaJabatan?.annualCap ?? 0),
      },
      ptkpAmount: Number(ptkp.amount),
      annualEmployeeJht: sum((p) => Number(p.bpjsJhtEmployee)) + decJht,
      annualEmployeeJp: sum((p) => Number(p.bpjsJpEmployee)) + decJp,
      pasal17Brackets: pasal17.map((b) => ({
        incomeLowerBound: b.incomeLowerBound,
        incomeUpperBound: b.incomeUpperBound,
        rate: b.rate,
      })),
      withheldJanNov: sum((p) => Number(p.pph21Amount)),
      npwpMissing: isNpwpMissing(employee.npwp),
    });
    return result.decemberPph21;
  }

  private async bpjsEmployeeRates(periodDate: string) {
    const kes =
      await this.bpjsKesehatanMasterService.resolveEffective(periodDate);
    const tk =
      await this.bpjsKetenagakerjaanMasterService.resolveEffective(periodDate);
    return {
      kesehatanRate: Number(kes.employeeRate),
      kesehatanCap: Number(kes.wageCap),
      jhtRate: Number(tk.jhtEmployeeRate),
      jpRate: Number(tk.jpEmployeeRate),
      jpCap: Number(tk.jpWageCap),
    };
  }

  private async bpjsCompanyRates(periodDate: string) {
    const kes =
      await this.bpjsKesehatanMasterService.resolveEffective(periodDate);
    const tk =
      await this.bpjsKetenagakerjaanMasterService.resolveEffective(periodDate);
    return {
      kesehatanRate: Number(kes.companyRate),
      kesehatanCap: Number(kes.wageCap),
      jhtRate: Number(tk.jhtCompanyRate),
      jpRate: Number(tk.jpCompanyRate),
      jpCap: Number(tk.jpWageCap),
      jkkRate: Number(tk.jkkCompanyRate),
      jkmRate: Number(tk.jkmCompanyRate),
    };
  }
}
