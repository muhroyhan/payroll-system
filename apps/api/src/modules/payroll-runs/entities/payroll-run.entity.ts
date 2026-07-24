import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { PayrollRunStatus } from '@payroll-system/shared-types';

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

  @Column(DataType.UUID)
  declare createdBy: string;

  // Set when the run moves calculated → approved.
  @Column(DataType.UUID)
  declare approvedBy: string | null;

  // Set when the run moves approved → disbursed; from then on the run and
  // everything under it are permanently immutable (§11).
  @Column(DataType.DATE)
  declare lockedAt: Date | null;

  // P8-T02 — how many employees the calculation job has processed / needs to
  // process this run, for the admin progress bar. Set absolutely (not
  // incremented) so a retried chunk can't double-count.
  @Default(0)
  @Column(DataType.INTEGER)
  declare processedCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  declare totalCount: number;
}
