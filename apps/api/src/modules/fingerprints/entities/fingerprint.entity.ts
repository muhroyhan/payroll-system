import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Employee } from '../../employees/entities/employee.entity';

// §5.3 — maps a fingerprint device's internal user id to an employee. Raw scans
// (attendance_raw_logs) only carry device_user_id/device_id; this table is what
// lets reconciliation (P3-T03) resolve a scan back to an employee_id.
@Table({ tableName: 'fingerprints', underscored: true, timestamps: true })
export class Fingerprint extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Employee)
  @Column(DataType.UUID)
  declare employeeId: string;

  @BelongsTo(() => Employee)
  declare employee: Employee;

  @Unique('fingerprints_device_user_device_unique')
  @Column(DataType.STRING)
  declare deviceUserId: string;

  @Unique('fingerprints_device_user_device_unique')
  @Column(DataType.STRING)
  declare deviceId: string;

  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare enrolledAt: Date;
}
