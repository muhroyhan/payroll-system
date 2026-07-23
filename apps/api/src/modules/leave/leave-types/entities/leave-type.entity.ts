import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';

// §5.4 — leave_types (cuti tahunan, sakit, izin khusus, ...). Simple lookup;
// referenced by leave_policy_master and (Phase 3) leave_balances/leave_requests.
@Table({ tableName: 'leave_types', underscored: true, timestamps: true })
export class LeaveType extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @Column(DataType.STRING)
  declare name: string;
}
