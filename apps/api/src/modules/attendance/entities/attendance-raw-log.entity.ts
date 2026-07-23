import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { ScanType } from '@payroll-system/shared-types';

// §5.3 — raw scans pulled from the fingerprint device/software, verbatim.
// Never updated once ingested (it's the raw source of truth) — only created
// or deleted (to clean up a bad import). Reconciliation (P3-T03) turns these
// into attendance_records; it never mutates rows here.
@Table({
  tableName: 'attendance_raw_logs',
  underscored: true,
  timestamps: true,
  updatedAt: false,
})
export class AttendanceRawLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.STRING)
  declare deviceUserId: string;

  @Column(DataType.STRING)
  declare deviceId: string;

  @Column(DataType.DATE)
  declare scanTime: Date;

  // Many devices don't report this — reconciliation infers in/out from scan
  // order per day when null.
  @Column(DataType.ENUM(...Object.values(ScanType)))
  declare scanType: ScanType | null;
}
