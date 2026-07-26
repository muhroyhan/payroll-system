import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Op } from 'sequelize';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import { SYSTEM_AUDIT_OPTIONS } from '../common/audit/audit-actor';
import { Employee } from '../modules/employees/entities/employee.entity';
import { PayrollRun } from '../modules/payroll-runs/entities/payroll-run.entity';
import { isTransitionAllowed } from '../modules/payroll-runs/payroll-run-transitions';
import {
  PayrollRunCalculationService,
  periodMonthRange,
} from '../modules/payroll-calculation/payroll-run-calculation.service';
import { Payslip } from '../modules/payslips/entities/payslip.entity';
import { PdfGenerationQueue } from './pdf-generation.queue';
import { PAYROLL_CALCULATION_QUEUE } from './payroll-calculation.queue';

// §01_GENERAL — "Process employees in chunks (e.g. 100–200 per batch)". 100 is
// the safe lower end: finer checkpointing, smaller retry unit. Free to tune.
const CHUNK_SIZE = 100;

// P8-T02/T04 — the calculation worker. Chunks the run's employees, runs the
// full §9 calculation per employee (P8-T04, PayrollRunCalculationService),
// tracks progress, and flips the run to `calculated`. Same PATTERN as
// PdfGenerationProcessor (one @Processor per queue, dispatch by job.name).
@Processor(PAYROLL_CALCULATION_QUEUE)
export class PayrollCalculationProcessor extends WorkerHost {
  private readonly logger = new Logger(PayrollCalculationProcessor.name);

  constructor(
    @InjectModel(PayrollRun)
    private readonly payrollRunModel: typeof PayrollRun,
    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,
    @InjectModel(Payslip)
    private readonly payslipModel: typeof Payslip,
    private readonly calculationService: PayrollRunCalculationService,
    private readonly pdfGenerationQueue: PdfGenerationQueue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'calculate-payroll-run':
        return this.calculatePayrollRun(job);
      default:
        this.logger.warn(`Unknown payroll-calculation job name: ${job.name}`);
    }
  }

  private async calculatePayrollRun(job: Job): Promise<void> {
    const { payrollRunId } = job.data as { payrollRunId: string };
    const run = await this.payrollRunModel.findByPk(payrollRunId);
    if (!run) {
      this.logger.warn(
        `Payroll run ${payrollRunId} no longer exists — skipping calculation`,
      );
      return;
    }

    // Idempotency guard: only a `draft` run is calculable. A retry that fires
    // after the run already reached `calculated` (or beyond) is a no-op — it
    // never re-processes or re-flips.
    if (run.status !== PayrollRunStatus.DRAFT) {
      this.logger.log(
        `Payroll run ${payrollRunId} is ${run.status}, not draft — calculation skipped (already done)`,
      );
      return;
    }

    // Task A — big-test finding: filtering by `status: ACTIVE` alone made a
    // run "all-or-nothing by status flag" — an employee who resigned DURING
    // this period (status flipped to inactive, endDate inside the period)
    // vanished from the run entirely instead of getting a prorated final
    // payslip. The correct filter is a date-range OVERLAP against the
    // employee's employment window [startDate, endDate ?? ∞), not the
    // current status: it naturally includes a full-month active employee, a
    // mid-month joiner (startDate inside the period), and a mid-month
    // resignee (endDate inside the period) — and excludes anyone whose
    // employment window doesn't touch this period at all (resigned before
    // it, or not yet hired). Task A's prorate.core.ts then handles the
    // partial-month math for whichever of these applies.
    const { start: periodStart, endExclusive: periodEndExclusive } =
      periodMonthRange(run.period);
    const where = {
      startDate: { [Op.lt]: periodEndExclusive },
      [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: periodStart } }],
    };
    const total = await this.employeeModel.count({ where });
    await run.update({ totalCount: total, processedCount: 0 });

    // P8-T03 — one scope-resolver cache for the whole run (snapshot-once,
    // shared across all chunks; never leaks to another run).
    const scopeCache = this.calculationService.newScopeCache(
      `${run.period}-01`,
    );

    // Stable ordering so a retry re-chunks the same employees into the same
    // batches (checkpoint-friendly, §01_GENERAL).
    for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
      const chunk = await this.employeeModel.findAll({
        where,
        order: [['id', 'ASC']],
        limit: CHUNK_SIZE,
        offset,
      });

      for (const employee of chunk) {
        // P8-T04 — full §9 calculation + payslip/line-item persistence per
        // employee, idempotent via the payslips (payroll_run_id, employee_id)
        // unique constraint (same DB-constraint pattern as kasbon_deductions).
        await this.calculationService.calculateEmployee(
          run,
          employee,
          scopeCache,
        );
      }

      // Absolute SET (not increment): re-running a chunk on retry writes the
      // same value, so progress can never double-count.
      await run.update({
        processedCount: Math.min(offset + chunk.length, total),
      });
    }

    // draft → calculated, through the same §5.8/§11 transition guard the
    // service uses (imported as a pure function to avoid a module cycle).
    if (isTransitionAllowed(run.status, PayrollRunStatus.CALCULATED)) {
      await run.update(
        { status: PayrollRunStatus.CALCULATED },
        SYSTEM_AUDIT_OPTIONS,
      );

      // P8-T05 — bulk-enqueue PDF generation for every payslip just created
      // in this run (one call, not a per-employee enqueue loop). Rides the
      // existing pdf-generation queue/processor, not a new one — a payslip
      // PDF is the same "one small per-document job" shape as a letter PDF.
      const payslips = await this.payslipModel.findAll({
        where: { payrollRunId: run.id },
        attributes: ['id'],
      });
      await this.pdfGenerationQueue.enqueuePayslipPdfBulk(
        payslips.map((p) => p.id),
      );
    }
  }
}
