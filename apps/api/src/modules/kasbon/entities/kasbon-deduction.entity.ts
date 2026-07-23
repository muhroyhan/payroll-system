import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Kasbon } from './kasbon.entity';

// §5.6/TC-KASBON-02 — one row per (kasbon, payroll_run) that ever actually
// deducted an installment. This is the idempotency guard: a DB-level unique
// constraint on (kasbon_id, payroll_run_id) is what makes a retried/re-
// triggered payroll run safe, not just an app-level "check then act" (which
// has a race window under concurrent/retried calls). It doubles as the audit
// trail payslip_line_items' source='kasbon' rows can point to via source_id.
// No FK on payroll_run_id — payroll_runs doesn't exist until Phase 8; this
// column is a plain UUID reference until then.
@Table({ tableName: 'kasbon_deductions', underscored: true, timestamps: true })
export class KasbonDeduction extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Kasbon)
  @Column(DataType.UUID)
  declare kasbonId: string;

  @BelongsTo(() => Kasbon)
  declare kasbon: Kasbon;

  @Column(DataType.UUID)
  declare payrollRunId: string;

  @Column(DataType.DECIMAL(15, 2))
  declare amount: string;
}
