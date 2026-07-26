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
import { KasbonStatus } from '@payroll-system/shared-types';
import { Employee } from '../../employees/entities/employee.entity';

// §5.6 — cash advance. `amount`/`installment_count`/`installment_amount`
// aren't fixed until approval (a pending request can still be edited or
// rejected), so `remaining_balance` stays null until approve() sets it to
// `amount`. Once at least one installment has been deducted
// (remaining_balance < amount), those three fields specifically become
// immutable (§11, 05_BOUNDARIES §12.6 TC-KASBON-04) — other fields
// (e.g. requestDate) stay editable. See
// KasbonService.assertLockedFieldsUntouched.
@Table({ tableName: 'kasbon', underscored: true, timestamps: true })
export class Kasbon extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Employee)
  @Column(DataType.UUID)
  declare employeeId: string;

  @BelongsTo(() => Employee)
  declare employee: Employee;

  @Column(DataType.DECIMAL(15, 2))
  declare amount: string;

  @Column(DataType.DATEONLY)
  declare requestDate: string;

  @Column(DataType.INTEGER)
  declare installmentCount: number;

  @Column(DataType.DECIMAL(15, 2))
  declare installmentAmount: string;

  // Set at approval time, not at creation — see class comment.
  @Column(DataType.DECIMAL(15, 2))
  declare remainingBalance: string | null;

  @Default(KasbonStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(KasbonStatus)))
  declare status: KasbonStatus;

  @Column(DataType.UUID)
  declare approvedBy: string | null;

  @Column(DataType.UUID)
  declare rejectedBy: string | null;

  @Column(DataType.TEXT)
  declare rejectReason: string | null;

  @Column(DataType.UUID)
  declare createdBy: string | null;
}
