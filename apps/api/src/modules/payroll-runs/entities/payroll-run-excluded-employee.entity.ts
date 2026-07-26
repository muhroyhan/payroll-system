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
import { Employee } from '../../employees/entities/employee.entity';
import { PayrollRun } from './payroll-run.entity';

// Task B — one row per (payroll_run, employee) that was EXCLUDED from that
// run's payslip generation instead of being allowed to fail the whole run.
// Currently the only exclusion reason is a negative computed net pay
// (deductions > gross), but `reason` is a free-text human explanation (not
// an enum) so future exclusion causes don't need a schema change. Unique on
// (payroll_run_id, employee_id) for the same idempotency reason as
// kasbon_deductions/payslips: a retried chunk must not double-insert.
@Table({
  tableName: 'payroll_run_excluded_employees',
  underscored: true,
  timestamps: true,
})
export class PayrollRunExcludedEmployee extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => PayrollRun)
  @Column(DataType.UUID)
  declare payrollRunId: string;

  @BelongsTo(() => PayrollRun)
  declare payrollRun: PayrollRun;

  @ForeignKey(() => Employee)
  @Column(DataType.UUID)
  declare employeeId: string;

  @BelongsTo(() => Employee)
  declare employee: Employee;

  @Column(DataType.STRING)
  declare reason: string;

  @Column(DataType.DECIMAL(15, 2))
  declare grossPay: string;

  // The (negative) net pay that triggered the exclusion — kept for HR to see
  // exactly how far under water the employee was, not just the reason text.
  @Column(DataType.DECIMAL(15, 2))
  declare netPay: string;
}
