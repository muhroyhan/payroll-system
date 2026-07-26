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
import { LeaveRequestStatus } from '@payroll-system/shared-types';
import { Employee } from '../../../employees/entities/employee.entity';
import { LeaveType } from '../../leave-types/entities/leave-type.entity';

// §5.4 — once approved or rejected, a request is permanently locked (§11):
// no edit, no delete, no un-approve. A correction is a new, separate request
// acting as an offsetting adjustment. Only `pending` rows may be edited/removed.
@Table({ tableName: 'leave_requests', underscored: true, timestamps: true })
export class LeaveRequest extends Model {
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

  @Column(DataType.DATEONLY)
  declare startDate: string;

  @Column(DataType.DATEONLY)
  declare endDate: string;

  @Default(LeaveRequestStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(LeaveRequestStatus)))
  declare status: LeaveRequestStatus;

  @Column(DataType.UUID)
  declare approvedBy: string | null;

  @Column(DataType.UUID)
  declare rejectedBy: string | null;

  @Column(DataType.TEXT)
  declare rejectReason: string | null;

  @Column(DataType.UUID)
  declare createdBy: string | null;
}
