import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { ScopeType } from '@payroll-system/shared-types';

// §5.2 Master Gaji Karyawan — base_salary resolved via the shared scope engine,
// effective-dated. Never hard-deleted (§11); retire a rule via effectiveEndDate.
@Table({ tableName: 'salary_masters', underscored: true, timestamps: true })
export class SalaryMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.ENUM(...Object.values(ScopeType)))
  declare scopeType: ScopeType;

  @Column(DataType.UUID)
  declare scopeValue: string;

  @Column(DataType.DECIMAL(15, 2))
  declare baseSalary: string;

  @Column(DataType.DATEONLY)
  declare effectiveStartDate: string;

  @Column(DataType.DATEONLY)
  declare effectiveEndDate: string | null;

  @Column(DataType.UUID)
  declare createdBy: string;

  @Column(DataType.UUID)
  declare updatedBy: string | null;

  // Set when this row is retired (effectiveEndDate closed) — required on
  // manual retire, auto-generated on automatic retire. See
  // assertRetireReasonProvided / closeOverlappingPredecessor.
  @Column(DataType.TEXT)
  declare reason: string | null;

  // Points at the row that superseded this one, set only by an automatic
  // retire (closeOverlappingPredecessor) — null for manual retires and for
  // rows that are still open.
  @Column(DataType.UUID)
  declare supersedesId: string | null;
}
