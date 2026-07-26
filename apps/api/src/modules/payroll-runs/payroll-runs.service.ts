import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import { PayrollCalculationQueue } from '../../jobs/payroll-calculation.queue';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollRunRevertService } from './payroll-run-revert.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { isTransitionAllowed } from './payroll-run-transitions';

// P8-T01/T02 — payroll_runs entity + orchestration (the §5.8/§11 state
// machine). The §9 calculation itself runs in the P8-T02 background job
// (enqueued by requestCalculation); the full per-employee assembly is P8-T04.
@Injectable()
export class PayrollRunsService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(PayrollRun)
    private readonly payrollRunModel: typeof PayrollRun,
    private readonly payrollCalculationQueue: PayrollCalculationQueue,
    private readonly revertService: PayrollRunRevertService,
  ) {}

  list(): Promise<PayrollRun[]> {
    return this.payrollRunModel.findAll();
  }

  // Task B — eager-loads excludedEmployees (+ each one's employee name) so
  // the run detail / calculate-progress screen (FE-T27) can render who was
  // excluded and why without a second round-trip. Harmless for every other
  // caller of this method (assertTransition, revert, etc.) — it's read-only
  // extra data alongside the run's own columns.
  async findByIdOrThrow(id: string): Promise<PayrollRun> {
    const record = await this.payrollRunModel.findByPk(id, {
      include: [{ association: 'excludedEmployees', include: ['employee'] }],
    });
    if (!record) {
      throw new NotFoundException(`Payroll run ${id} not found`);
    }
    return record;
  }

  create(dto: CreatePayrollRunDto, createdBy: string): Promise<PayrollRun> {
    return this.payrollRunModel.create({
      period: dto.period,
      status: PayrollRunStatus.DRAFT,
      createdBy,
    } as any);
  }

  // P8-T02 — enqueue the background calculation job and return immediately
  // (§01_GENERAL: the action enqueues and returns; the UI polls progress).
  // Only a `draft` run may be (re)calculated — a calculated/approved/disbursed
  // run must first be reverted to draft (§11).
  async requestCalculation(id: string): Promise<{ payrollRunId: string }> {
    const record = await this.findByIdOrThrow(id);
    if (record.status !== PayrollRunStatus.DRAFT) {
      throw new ConflictException(
        `Payroll run ${id} is ${record.status} — only a draft run can be ` +
          `calculated; revert it to draft first (§11)`,
      );
    }
    await this.payrollCalculationQueue.enqueueCalculateRun(record.id);
    return { payrollRunId: record.id };
  }

  // draft → calculated. Called by the P8-T02 calculation job (kept here for the
  // service API; the job itself updates the run directly to avoid a module
  // cycle). Not an HTTP action.
  async markCalculated(id: string): Promise<PayrollRun> {
    const record = await this.assertTransition(id, PayrollRunStatus.CALCULATED);
    return record.update({ status: PayrollRunStatus.CALCULATED });
  }

  // calculated → approved.
  async approve(id: string, approvedBy: string): Promise<PayrollRun> {
    const record = await this.assertTransition(id, PayrollRunStatus.APPROVED);
    return record.update({ status: PayrollRunStatus.APPROVED, approvedBy });
  }

  // approved → disbursed. Sets locked_at; the run is now permanently immutable.
  async disburse(id: string): Promise<PayrollRun> {
    const record = await this.assertTransition(id, PayrollRunStatus.DISBURSED);
    return record.update({
      status: PayrollRunStatus.DISBURSED,
      lockedAt: new Date(),
    });
  }

  // calculated → draft. Only from `calculated` (§11 — an approved/disbursed run
  // has no revert path, TC-PAYROLL-05).
  async revertToDraft(id: string): Promise<PayrollRun> {
    const record = await this.assertTransition(id, PayrollRunStatus.DRAFT);
    // P8-T07 — closes the gap flagged in P8-T01: reverting throws away this
    // run's provisional payslips + line items (regenerated from corrected data
    // on recalc) and rolls back the kasbon installments they drew, then flips
    // the status. All in one transaction so a failure can't leave the run
    // half-torn-down. Deleting the line items also auto-releases any
    // sanction/overtime letter they had locked (§11 — that lock is derived
    // from the reference, see PayrollRunRevertService).
    await this.sequelize.transaction(async (transaction) => {
      await this.revertService.revertRunData(id, transaction);
      // The torn-down payslips/line items this run had calculated are gone,
      // so the P8-T02 progress counters must go back to 0 too — otherwise a
      // reverted run reports stale 100% progress from its previous
      // calculation attempt, and the UI's "still calculating" detection
      // (draft + totalCount > 0) never clears.
      await record.update(
        { status: PayrollRunStatus.DRAFT, processedCount: 0, totalCount: 0 },
        { transaction },
      );
    });
    return record;
  }

  private async assertTransition(
    id: string,
    to: PayrollRunStatus,
  ): Promise<PayrollRun> {
    const record = await this.findByIdOrThrow(id);
    if (!isTransitionAllowed(record.status, to)) {
      throw new ConflictException(
        `Payroll run ${id} cannot move from ${record.status} to ${to} — ` +
          `the lifecycle is forward-only and only a calculated run may revert ` +
          `to draft (§11)`,
      );
    }
    return record;
  }
}
