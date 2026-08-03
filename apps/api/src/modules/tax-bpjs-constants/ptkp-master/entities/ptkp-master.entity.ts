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
import { PtkpStatus } from '@payroll-system/shared-types';
import { User } from '../../../users/entities/user.entity';

// §7 — annual PTKP amount per status, effective-dated. Never hard-deleted (§11);
// retire a superseded figure via effectiveEndDate. Seeded with verified values
// in P1-T10 — this task only builds the admin-editable table.
@Table({ tableName: 'ptkp_masters', underscored: true, timestamps: true })
export class PtkpMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.ENUM(...Object.values(PtkpStatus)))
  declare ptkpStatus: PtkpStatus;

  @Column(DataType.DECIMAL(15, 2))
  declare amount: string;

  @Column(DataType.DATEONLY)
  declare effectiveStartDate: string;

  @Column(DataType.DATEONLY)
  declare effectiveEndDate: string | null;

  @Column(DataType.UUID)
  declare createdBy: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare updatedBy: string | null;

  // BUGS#19 — see salary_master's updatedByUser.
  @BelongsTo(() => User, 'updatedBy')
  declare updatedByUser: User | null;

  @Column(DataType.TEXT)
  declare reason: string | null;

  @Column(DataType.UUID)
  declare supersedesId: string | null;
}
