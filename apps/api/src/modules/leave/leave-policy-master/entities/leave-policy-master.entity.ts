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
import { LeaveType } from '../../leave-types/entities/leave-type.entity';

// §5.4 — standardized leave quota, resolved via the shared scope engine and
// effective-dated. Per-employee overrides live in leave_balances (Phase 3),
// not here. Never hard-deleted (§11).
@Table({
  tableName: 'leave_policy_masters',
  underscored: true,
  timestamps: true,
})
export class LeavePolicyMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => LeaveType)
  @Column(DataType.UUID)
  declare leaveTypeId: string;

  @BelongsTo(() => LeaveType)
  declare leaveType: LeaveType;

  @Column(DataType.ENUM(...Object.values(ScopeType)))
  declare scopeType: ScopeType;

  @Column(DataType.UUID)
  declare scopeValue: string;

  @Column(DataType.INTEGER)
  declare annualQuota: number;

  @Column(DataType.DATEONLY)
  declare effectiveStartDate: string;

  @Column(DataType.DATEONLY)
  declare effectiveEndDate: string | null;

  @Column(DataType.UUID)
  declare createdBy: string;
}
