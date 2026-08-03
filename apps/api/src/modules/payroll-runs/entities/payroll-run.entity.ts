import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import { User } from '../../users/entities/user.entity';
import { Payslip } from '../../payslips/entities/payslip.entity';
import { PayrollRunExcludedEmployee } from './payroll-run-excluded-employee.entity';

// §5.8 — a payroll run for one period (id, period, status, created_by,
// approved_by, locked_at) plus the P8-T02 progress counters
// (processed_count/total_count) for the chunked calculation job's progress
// bar. Never hard-deleted (§11).
@Table({ tableName: 'payroll_runs', underscored: true, timestamps: true })
export class PayrollRun extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  // 'YYYY-MM' (e.g. '2026-07').
  @Column(DataType.STRING)
  declare period: string;

  @Default(PayrollRunStatus.DRAFT)
  @Column(DataType.ENUM(...Object.values(PayrollRunStatus)))
  declare status: PayrollRunStatus;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare createdBy: string;

  // BUGS#19 — id/name only, see disbursedByUser below.
  @BelongsTo(() => User, 'createdBy')
  declare createdByUser: User | null;

  // Set when the run moves calculated → approved.
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare approvedBy: string | null;

  @BelongsTo(() => User, 'approvedBy')
  declare approvedByUser: User | null;

  // Set when the run moves approved → disbursed; from then on the run and
  // everything under it are permanently immutable (§11).
  @Column(DataType.DATE)
  declare lockedAt: Date | null;

  // Audit-trail follow-up (dispute-traceability review, §1B) — the actual
  // money-out step previously recorded only lockedAt (a timestamp), no actor.
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare disbursedBy: string | null;

  // Eager-loaded on the run detail fetch (findByIdOrThrow) so the UI can
  // render "Dicairkan oleh: {nama}" without a second round-trip or a
  // separate GET /users call (which HR_STAFF can't make — that endpoint is
  // admin-only).
  @BelongsTo(() => User, 'disbursedBy')
  declare disbursedByUser: User | null;

  // Audit-trail follow-up — calculated → draft previously recorded NO actor
  // and NO reason at all, despite tearing down every payslip/kasbon
  // deduction the run had produced (PayrollRunRevertService). Both are
  // written together, never one without the other (see revertToDraft).
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare revertedBy: string | null;

  @BelongsTo(() => User, 'revertedBy')
  declare revertedByUser: User | null;

  @Column(DataType.TEXT)
  declare revertReason: string | null;

  // P8-T02 — how many employees the calculation job has processed / needs to
  // process this run, for the admin progress bar. Set absolutely (not
  // incremented) so a retried chunk can't double-count.
  @Default(0)
  @Column(DataType.INTEGER)
  declare processedCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  declare totalCount: number;

  // BUGS#15 — step-level companion to processedCount/totalCount above: what
  // the job was actually doing at each checkpoint (start, each chunk,
  // completion), not just a percentage. Appended to by
  // PayrollCalculationProcessor, capped at MAX_PROGRESS_LOG_ENTRIES there.
  @Default([])
  @Column(DataType.JSON)
  declare progressLog: Array<{ message: string; at: string }>;

  // Reciprocal of Payslip's @BelongsTo(() => PayrollRun) — required by
  // EffectiveRangePayslipChecker's `PayrollRun.findAll({ include: [{ model:
  // Payslip }] })` (effective-range-payslip-checker.ts). Without this side,
  // Sequelize throws EagerLoadingError at query time regardless of data,
  // which crashed every locked-field edit on the six effective-dated
  // constant masters with a 500 instead of a 409/success.
  @HasMany(() => Payslip)
  declare payslips: Payslip[];

  // Task B — employees excluded from this run (negative computed net pay,
  // §11-adjacent partial-failure pattern). Eager-loaded on the run detail
  // fetch so the calculate/progress screen (FE-T27) can show who needs a fix
  // + recalculate, without a second round-trip.
  @HasMany(() => PayrollRunExcludedEmployee)
  declare excludedEmployees: PayrollRunExcludedEmployee[];
}
