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
import { SPLevel } from '@payroll-system/shared-types';
import { Employee } from '../../../employees/entities/employee.entity';
import { PayslipComponent } from '../../../payslip-components/entities/payslip-component.entity';

// §5.5 — SP / warning letter + optional sanction. No pending/approved status
// (unlike surat_ijin/overtime_letter) — §5.5 lists no such field for this
// entity, so it's issued the moment it's created. Locked once
// sanction_amount is pulled into a payslip_line_item (§11, Phase 8) — see
// SanctionReferenceChecker.
@Table({ tableName: 'surat_peringatan', underscored: true, timestamps: true })
export class SuratPeringatan extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Employee)
  @Column(DataType.UUID)
  declare employeeId: string;

  @BelongsTo(() => Employee)
  declare employee: Employee;

  @Column(DataType.ENUM(...Object.values(SPLevel)))
  declare level: SPLevel;

  @Column(DataType.TEXT)
  declare violationDescription: string;

  @Column(DataType.DATEONLY)
  declare issueDate: string;

  @ForeignKey(() => PayslipComponent)
  @Column(DataType.UUID)
  declare sanctionComponentId: string | null;

  @BelongsTo(() => PayslipComponent)
  declare sanctionComponent: PayslipComponent | null;

  @Column(DataType.DECIMAL(15, 2))
  declare sanctionAmount: string | null;

  @Column(DataType.UUID)
  declare issuedBy: string;

  // Populated asynchronously by the PDF generation job right after creation —
  // never generated synchronously in the request handler (§3, no exceptions).
  @Column(DataType.STRING)
  declare pdfPath: string | null;
}
