import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

// P1-T09 — monthly payroll cycle config (§4: monthly cycle only, no biweekly/
// weekly support). Single-tenant, so this is a singleton row — the service
// enforces "at most one row" rather than the schema, since Sequelize has no
// clean cross-DB way to constrain a table to a single row.
@Table({
  tableName: 'salary_period_configs',
  underscored: true,
  timestamps: true,
})
export class SalaryPeriodConfig extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  // Day of month attendance/other source data is cut off for payroll processing.
  @Column(DataType.TINYINT)
  declare attendanceCutoffDay: number;

  // Target day of month salaries are disbursed.
  @Column(DataType.TINYINT)
  declare payrollDisbursementDay: number;

  @Column(DataType.UUID)
  declare updatedBy: string;
}
