import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import { PayrollCalculationQueue } from '../../jobs/payroll-calculation.queue';
import { PayrollRun } from './entities/payroll-run.entity';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { isTransitionAllowed } from './payroll-run-transitions';

// P8-T01/T02 — payroll_runs entity + orchestration (the §5.8/§11 state
// machine). The §9 calculation itself runs in the P8-T02 background job
// (enqueued by requestCalculation); the full per-employee assembly is P8-T04.
@Injectable()
export class PayrollRunsService {
  constructor(
    @InjectModel(PayrollRun)
    private readonly payrollRunModel: typeof PayrollRun,
    private readonly payrollCalculationQueue: PayrollCalculationQueue,
  ) {}

  list(): Promise<PayrollRun[]> {
    return this.payrollRunModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<PayrollRun> {
    const record = await this.payrollRunModel.findByPk(id);
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
    // P8-T04 — when payslips/payslip_line_items exist, reverting must also
    // delete this run's still-draft payslips + line items so they regenerate
    // from corrected data (§11). Flagged; those tables don't exist yet.
    return record.update({ status: PayrollRunStatus.DRAFT });
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
