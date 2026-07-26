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
import { LeavePolicyMaster } from '../../leave-policy-master/entities/leave-policy-master.entity';

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

  // Audit-trail follow-up (§1C) — who/why for the last manual quota edit.
  // Written together, never one without the other — see updateQuota().
  @Column(DataType.UUID)
  declare adjustedBy: string | null;

  @Column(DataType.TEXT)
  declare adjustmentReason: string | null;

  // The leave_policy_master row resolveOne() actually resolved this balance
  // from, if any (null for rows that predate this column). Lets
  // LeavePolicyMasterService answer "has this policy row ever been used"
  // without re-running the scope resolver — see its assertLockedFieldsUntouched.
  @ForeignKey(() => LeavePolicyMaster)
  @Column(DataType.UUID)
  declare resolvedFromPolicyId: string | null;
}
