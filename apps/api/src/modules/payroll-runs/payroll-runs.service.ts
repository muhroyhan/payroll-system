import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import { PayrollRun } from './entities/payroll-run.entity';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { isTransitionAllowed } from './payroll-run-transitions';

// P8-T01 — payroll_runs entity + basic orchestration (the §5.8/§11 state
// machine). This does NOT run the §9 calculation or generate payslips — that's
// P8-T02 (job) / P8-T04 (assembly). It owns the guarded lifecycle only.
@Injectable()
export class PayrollRunsService {
  constructor(
    @InjectModel(PayrollRun)
    private readonly payrollRunModel: typeof PayrollRun,
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

  // draft → calculated. Called by the P8-T02 calculation job once the payslips
  // for this run have been generated — not an HTTP action here.
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
