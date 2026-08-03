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
import { SuratIjinStatus, SuratIjinType } from '@payroll-system/shared-types';
import { Employee } from '../../../employees/entities/employee.entity';
import { User } from '../../../users/entities/user.entity';

// §5.5 — permission letter (late arrival / early leave). Once approved or
// rejected it's permanently locked (§11), same shape as leave_requests — no
// edit/delete/un-approve past pending; a correction is a new letter.
@Table({ tableName: 'surat_ijin', underscored: true, timestamps: true })
export class SuratIjin extends Model {
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

  @Column(DataType.ENUM(...Object.values(SuratIjinType)))
  declare type: SuratIjinType;

  @Column(DataType.TEXT)
  declare reason: string;

  // Time of the late arrival / early leave being requested, e.g. "09:30".
  @Column(DataType.STRING)
  declare timeRequested: string;

  @Default(SuratIjinStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(SuratIjinStatus)))
  declare status: SuratIjinStatus;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare approvedBy: string | null;

  // BUGS#19 — id/name only, see payroll_runs' disbursedByUser.
  @BelongsTo(() => User, 'approvedBy')
  declare approvedByUser: User | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare rejectedBy: string | null;

  @BelongsTo(() => User, 'rejectedBy')
  declare rejectedByUser: User | null;

  @Column(DataType.TEXT)
  declare rejectReason: string | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare createdBy: string | null;

  @BelongsTo(() => User, 'createdBy')
  declare createdByUser: User | null;

  // Populated asynchronously by the PDF generation job once approved —
  // never generated synchronously in the request handler (§3, no exceptions).
  @Column(DataType.STRING)
  declare pdfPath: string | null;
}
