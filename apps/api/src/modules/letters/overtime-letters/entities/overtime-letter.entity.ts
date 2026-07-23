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
import { OvertimeLetterStatus } from '@payroll-system/shared-types';
import { Employee } from '../../../employees/entities/employee.entity';

// §5.5 — Surat Lembur, verifies overtime actually happened. Unlike
// surat_ijin/leave_requests (permanently locked the moment they leave
// pending), this one stays editable/deletable after verification — §11
// (05_BOUNDARIES §12.5) specifically ties its lock to being "verified AND
// already used in a payslip_line_item" (Phase 8), not to verification alone.
// See PayslipReferenceChecker.
@Table({ tableName: 'overtime_letters', underscored: true, timestamps: true })
export class OvertimeLetter extends Model {
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

  @Column(DataType.DECIMAL(5, 2))
  declare plannedOvertimeHours: string;

  // §9/TC-LETTER-03 — payroll uses this, not planned, when they differ.
  @Column(DataType.DECIMAL(5, 2))
  declare actualOvertimeHours: string;

  @Column(DataType.TEXT)
  declare reason: string;

  @Default(OvertimeLetterStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(OvertimeLetterStatus)))
  declare status: OvertimeLetterStatus;

  @Column(DataType.UUID)
  declare verifiedBy: string | null;

  // Populated asynchronously by the PDF generation job once verified — never
  // generated synchronously in the request handler (§3, no exceptions).
  @Column(DataType.STRING)
  declare pdfPath: string | null;
}
