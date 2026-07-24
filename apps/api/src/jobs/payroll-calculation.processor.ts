import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  EmployeeActiveStatus,
  PayrollRunStatus,
} from '@payroll-system/shared-types';
import { Employee } from '../modules/employees/entities/employee.entity';
import { PayrollRun } from '../modules/payroll-runs/entities/payroll-run.entity';
import { isTransitionAllowed } from '../modules/payroll-runs/payroll-run-transitions';
import { PAYROLL_CALCULATION_QUEUE } from './payroll-calculation.queue';

// §01_GENERAL — "Process employees in chunks (e.g. 100–200 per batch)". 100 is
// the safe lower end: finer checkpointing, smaller retry unit. Free to tune.
const CHUNK_SIZE = 100;

// P8-T02 — SKELETON only. Iterates the run's employees in chunks and tracks
// progress; the real §9 per-employee calculation + payslip bulkCreate is
// P8-T04 (the placeholder loop below). Same PATTERN as PdfGenerationProcessor
// (one @Processor per queue, dispatch by job.name) — never a second competing
// worker on this queue.
@Processor(PAYROLL_CALCULATION_QUEUE)
export class PayrollCalculationProcessor extends WorkerHost {
  private readonly logger = new Logger(PayrollCalculationProcessor.name);

  constructor(
    @InjectModel(PayrollRun)
    private readonly payrollRunModel: typeof PayrollRun,
    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,
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

    const where = { status: EmployeeActiveStatus.ACTIVE };
    const total = await this.employeeModel.count({ where });
    await run.update({ totalCount: total, processedCount: 0 });

    // Stable ordering so a retry re-chunks the same employees into the same
    // batches (checkpoint-friendly, §01_GENERAL).
    for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
      const chunk = await this.employeeModel.findAll({
        where,
        order: [['id', 'ASC']],
        limit: CHUNK_SIZE,
        offset,
      });

      for (const _employee of chunk) {
        // P8-T04 — real §9 calculation + payslip/payslip_line_items bulkCreate
        // per employee goes here (with a unique constraint on
        // (payroll_run_id, employee_id) for insert-level idempotency, same
        // DB-constraint pattern as kasbon_deductions, P5-T02). Placeholder for
        // now — the skeleton only exercises chunking + progress.
        void _employee;
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
      await run.update({ status: PayrollRunStatus.CALCULATED });
    }
  }
}
