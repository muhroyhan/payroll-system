import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { PtkpStatus } from '@payroll-system/shared-types';
import { PayrollRun } from '../../modules/payroll-runs/entities/payroll-run.entity';
import { Payslip } from '../../modules/payslips/entities/payslip.entity';
import { EffectiveDatedFields, isEffectiveOn } from './resolve-effective';

// §11 audit fix — ptkp_master / bpjs_kesehatan_master / bpjs_ketenagakerjaan_master
// / ter_bracket_master all feed payroll calculation (PayrollRunCalculationService's
// bpjsEmployeeRates/bpjsCompanyRates/computeDecemberPph21, and the TER lookup
// inside calculateEmployeePayslip), but the payslip_line_items row they produce
// for TAX/BPJS has source_id = null (payslip-line-item.entity.ts: "Polymorphic
// (no FK); null for tax/bpjs computed lines") — unlike salary_master/
// incentive_master, which write their own row id as source_id. There is no
// single id to trace back to, so PayslipReferenceChecker's (source, source_id)
// lookup — the mechanism salary_master/incentive_master/sanction/overtime all
// use — cannot apply to these four. Forcing them through that interface would
// mean querying a column that's always null, i.e. a guard that silently never
// fires (worse than no guard: it *looks* covered in code review but isn't).
//
// What CAN be checked precisely, without any schema change: these constants are
// resolved once per period — optionally narrowed by a fixed category
// (ptkpStatus for ptkp_master, a TER category for ter_bracket_master; BPJS
// Kesehatan/Ketenagakerjaan have no category at all, one rate card per period)
// — never by employee/department scope the way salary_master is. So "does a
// payslip already exist for a period this row's effective range covers (and,
// where applicable, for an employee in this row's category)" is an exact
// answer, not a heuristic, provided effective ranges for the same category
// never overlap — the same data-quality assumption resolve-effective.ts's
// pickLatestEffective already leans on elsewhere in this codebase.
@Injectable()
export class EffectiveRangePayslipChecker {
  constructor(
    @InjectModel(PayrollRun)
    private readonly payrollRunModel: typeof PayrollRun,
    @InjectModel(Payslip)
    private readonly payslipModel: typeof Payslip,
  ) {}

  /**
   * @param range the master row's own effective-date window.
   * @param categoryMatches optional per-employee filter — e.g. "this
   *   payslip's employee has ptkpStatus X" or "...maps to TER category Y".
   *   Omit entirely for constants with no per-employee category (BPJS
   *   Kesehatan/Ketenagakerjaan): any payslip in range is then enough.
   */
  async isReferenced(
    range: EffectiveDatedFields,
    categoryMatches?: (employee: { ptkpStatus: PtkpStatus }) => boolean,
  ): Promise<boolean> {
    // One row per payroll run that has at least one payslip — small (a
    // handful of runs per year), regardless of how many employees/years of
    // history exist, so this stays cheap on every master-data edit attempt.
    const runsWithPayslips = await this.payrollRunModel.findAll({
      attributes: ['id', 'period'],
      include: [{ model: Payslip, attributes: [], required: true }],
      group: ['PayrollRun.id', 'PayrollRun.period'],
    });

    const candidateRunIds = runsWithPayslips
      .filter((run) => isEffectiveOn(range, `${run.period}-01`))
      .map((run) => run.id);
    if (candidateRunIds.length === 0) {
      return false;
    }
    if (!categoryMatches) {
      return true;
    }

    const payslips = await this.payslipModel.findAll({
      where: { payrollRunId: { [Op.in]: candidateRunIds } },
      attributes: ['id'],
      include: [{ association: 'employee', attributes: ['ptkpStatus'] }],
    });
    return payslips.some((payslip) =>
      categoryMatches((payslip as unknown as { employee: { ptkpStatus: PtkpStatus } }).employee),
    );
  }
}
