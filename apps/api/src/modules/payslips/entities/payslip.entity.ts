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
import { Employee } from '../../employees/entities/employee.entity';
import { PayrollRun } from '../../payroll-runs/entities/payroll-run.entity';
import { PayslipLineItem } from './payslip-line-item.entity';

// §5.8 — one payslip per (run, employee), CRU only (never delete, §11). Once
// the run is approved, all money fields are immutable — only pdf_path may
// change (P8-T07 guard). Unique (payroll_run_id, employee_id) — P8-T04
// idempotency.
@Table({ tableName: 'payslips', underscored: true, timestamps: true })
export class Payslip extends Model {
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

  @Column(DataType.DECIMAL(15, 2))
  declare grossPay: string;

  // Taxable portion of gross — kept so the December annual true-up can
  // aggregate the year's taxable income (beyond §5.8's literal columns).
  @Column(DataType.DECIMAL(15, 2))
  declare taxableGross: string;

  @Column(DataType.DECIMAL(15, 2))
  declare pph21Amount: string;

  @Column(DataType.DECIMAL(15, 2))
  declare bpjsKesehatanEmployee: string;

  @Column(DataType.DECIMAL(15, 2))
  declare bpjsKesehatanCompany: string;

  @Column(DataType.DECIMAL(15, 2))
  declare bpjsJhtEmployee: string;

  @Column(DataType.DECIMAL(15, 2))
  declare bpjsJhtCompany: string;

  @Column(DataType.DECIMAL(15, 2))
  declare bpjsJpEmployee: string;

  @Column(DataType.DECIMAL(15, 2))
  declare bpjsJpCompany: string;

  @Column(DataType.DECIMAL(15, 2))
  declare bpjsJkkCompany: string;

  @Column(DataType.DECIMAL(15, 2))
  declare bpjsJkmCompany: string;

  @Column(DataType.DECIMAL(15, 2))
  declare netPay: string;

  @Column(DataType.STRING)
  declare pdfPath: string | null;

  // Task A — prorate proporsional (join/resign mid-period), working-days
  // basis (prorate.core.ts). Null for payslips generated before this
  // feature existed — a genuine "not tracked", not zero. When
  // workedDays < totalWorkingDays the payslip detail screen renders
  // "Prorata (X dari Y hari kerja)" (FE-T30/31).
  @Column(DataType.DECIMAL(5, 2))
  declare workedDays: string | null;

  @Column(DataType.INTEGER)
  declare totalWorkingDays: number | null;

  @HasMany(() => PayslipLineItem)
  declare lineItems: PayslipLineItem[];
}
