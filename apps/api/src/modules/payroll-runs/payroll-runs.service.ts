import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';
import { PayrollRunStatus, Role } from '@payroll-system/shared-types';
import { PayrollCalculationQueue } from '../../jobs/payroll-calculation.queue';
import { auditOptions, SYSTEM_AUDIT_OPTIONS } from '../../common/audit/audit-actor';
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
    // BUGS#3 — newest-updated first, the default for every listing.
    return this.payrollRunModel.findAll({ order: [['updatedAt', 'DESC']] });
  }

  // Task B — eager-loads excludedEmployees (+ each one's employee name) so
  // the run detail / calculate-progress screen (FE-T27) can render who was
  // excluded and why without a second round-trip. Harmless for every other
  // caller of this method (assertTransition, revert, etc.) — it's read-only
  // extra data alongside the run's own columns.
  async findByIdOrThrow(id: string): Promise<PayrollRun> {
    const record = await this.payrollRunModel.findByPk(id, {
      include: [
        { association: 'excludedEmployees', include: ['employee'] },
        // Caught during live verification (audit-trail follow-up) — without
        // this attributes restriction, Sequelize's default eager-load
        // returned every User column, including passwordHash, straight out
        // over the API. Only id/name are ever needed for the "Dicairkan
        // oleh: {nama}" display (PayrollRunDetailPage).
        { association: 'disbursedByUser', attributes: ['id', 'name'] },
        // BUGS#19 — same treatment for the other three actor columns this
        // entity has, previously still shown as raw ids.
        { association: 'createdByUser', attributes: ['id', 'name'] },
        { association: 'approvedByUser', attributes: ['id', 'name'] },
        { association: 'revertedByUser', attributes: ['id', 'name'] },
      ],
    });
    if (!record) {
      throw new NotFoundException(`Payroll run ${id} not found`);
    }
    return record;
  }

  create(
    dto: CreatePayrollRunDto,
    createdBy: string,
    actorRole: Role,
  ): Promise<PayrollRun> {
    return this.payrollRunModel.create(
      {
        period: dto.period,
        status: PayrollRunStatus.DRAFT,
        createdBy,
      } as any,
      auditOptions({ id: createdBy, role: actorRole }),
    );
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
    return record.update(
      { status: PayrollRunStatus.CALCULATED },
      SYSTEM_AUDIT_OPTIONS,
    );
  }

  // calculated → approved.
  async approve(
    id: string,
    approvedBy: string,
    actorRole: Role,
  ): Promise<PayrollRun> {
    const record = await this.assertTransition(id, PayrollRunStatus.APPROVED);
    return record.update(
      { status: PayrollRunStatus.APPROVED, approvedBy },
      auditOptions({ id: approvedBy, role: actorRole }),
    );
  }

  // approved → disbursed. Sets locked_at; the run is now permanently immutable.
  async disburse(
    id: string,
    disbursedBy: string,
    actorRole: Role,
  ): Promise<PayrollRun> {
    const record = await this.assertTransition(id, PayrollRunStatus.DISBURSED);
    return record.update(
      {
        status: PayrollRunStatus.DISBURSED,
        lockedAt: new Date(),
        disbursedBy,
      },
      auditOptions({ id: disbursedBy, role: actorRole }),
    );
  }

  // calculated → draft. Only from `calculated` (§11 — an approved/disbursed run
  // has no revert path, TC-PAYROLL-05).
  //
  // Audit-trail follow-up (dispute-traceability review, §1B) — reverted_by/
  // revert_reason are written INSIDE the same transaction as the teardown,
  // and specifically BEFORE revertRunData() runs: if the teardown throws
  // partway through, the transaction rolls back everything together (the
  // status flip, the actor/reason, AND the deletes) rather than leaving a
  // run that's still `calculated` but already missing its payslips.
  async revertToDraft(
    id: string,
    revertedBy: string,
    revertReason: string,
    actorRole: Role,
  ): Promise<PayrollRun> {
    const record = await this.assertTransition(id, PayrollRunStatus.DRAFT);
    const actor = auditOptions({ id: revertedBy, role: actorRole }, revertReason);
    // P8-T07 — closes the gap flagged in P8-T01: reverting throws away this
    // run's provisional payslips + line items (regenerated from corrected data
    // on recalc) and rolls back the kasbon installments they drew, then flips
    // the status. All in one transaction so a failure can't leave the run
    // half-torn-down. Deleting the line items also auto-releases any
    // sanction/overtime letter they had locked (§11 — that lock is derived
    // from the reference, see PayrollRunRevertService).
    await this.sequelize.transaction(async (transaction) => {
      await record.update(
        { revertedBy, revertReason },
        { transaction, ...actor },
      );
      await this.revertService.revertRunData(id, transaction);
      // The torn-down payslips/line items this run had calculated are gone,
      // so the P8-T02 progress counters must go back to 0 too — otherwise a
      // reverted run reports stale 100% progress from its previous
      // calculation attempt, and the UI's "still calculating" detection
      // (draft + totalCount > 0) never clears.
      await record.update(
        { status: PayrollRunStatus.DRAFT, processedCount: 0, totalCount: 0 },
        { transaction, ...actor },
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
