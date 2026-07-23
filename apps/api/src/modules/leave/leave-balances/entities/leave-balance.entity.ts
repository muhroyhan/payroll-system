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
import { Employee } from '../../../employees/entities/employee.entity';
import { LeaveType } from '../../leave-types/entities/leave-type.entity';

// §5.4 — per-employee leave balance. quota is initially resolved from
// leave_policy_master via the scope resolver, then directly HR-editable
// (manually_adjusted tracks that). `used` must only ever move via the
// leave_requests approval workflow — never a direct edit (§11).
@Table({
  tableName: 'leave_balances',
  underscored: true,
  timestamps: true,
  indexes: [{ unique: true, fields: ['employee_id', 'leave_type_id', 'year'] }],
})
export class LeaveBalance extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Employee)
  @Column(DataType.UUID)
  declare employeeId: string;

  @BelongsTo(() => Employee)
  declare employee: Employee;

  @ForeignKey(() => LeaveType)
  @Column(DataType.UUID)
  declare leaveTypeId: string;

  @BelongsTo(() => LeaveType)
  declare leaveType: LeaveType;

  @Column(DataType.INTEGER)
  declare year: number;

  @Column(DataType.INTEGER)
  declare quota: number;

  @Default(0)
  @Column(DataType.INTEGER)
  declare used: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare manuallyAdjusted: boolean;
}
