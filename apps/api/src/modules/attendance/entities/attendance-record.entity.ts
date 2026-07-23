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
import { AttendanceSource } from '@payroll-system/shared-types';
import { Employee } from '../../employees/entities/employee.entity';

// §5.3 — the reconciled, payroll-facing attendance fact for one employee/date.
// Unique on (employee_id, date): exactly one row per day, regardless of which
// source produced it (TC-ATT-07 — no silent duplication across sources).
@Table({
  tableName: 'attendance_records',
  underscored: true,
  timestamps: true,
  indexes: [{ unique: true, fields: ['employee_id', 'date'] }],
})
export class AttendanceRecord extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Employee)
  @Column(DataType.UUID)
  declare employeeId: string;

  @BelongsTo(() => Employee)
  declare employee: Employee;

  @Column(DataType.DATEONLY)
  declare date: string;

  @Column(DataType.DATE)
  declare clockIn: Date | null;

  @Column(DataType.DATE)
  declare clockOut: Date | null;

  @Default(0)
  @Column(DataType.DECIMAL(5, 2))
  declare overtimeHours: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isHoliday: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isOnLeave: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare hasPermission: boolean;

  // TC-ATT-02 — one raw scan on a day (missed clock-out) is flagged explicitly,
  // never silently treated as a full day or a zero day.
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare hasMissedClockOut: boolean;

  @Column(DataType.ENUM(...Object.values(AttendanceSource)))
  declare source: AttendanceSource;
}
