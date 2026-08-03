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
import { ScopeType } from '@payroll-system/shared-types';
import { User } from '../../users/entities/user.entity';

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

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare updatedBy: string | null;

  // BUGS#19 — eager-loaded (attributes: ['id', 'name'] only, same as
  // payroll_runs' disbursedByUser) so "Diubah Oleh" can render a name
  // instead of a raw user id, without a separate admin-only GET /users call.
  @BelongsTo(() => User, 'updatedBy')
  declare updatedByUser: User | null;

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
