import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

// §8 — BPJS Kesehatan: 1% employee / 4% company of (base salary + fixed
// allowances), capped at wageCap. Effective-dated; never hard-deleted (§11).
@Table({
  tableName: 'bpjs_kesehatan_masters',
  underscored: true,
  timestamps: true,
})
export class BpjsKesehatanMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.DECIMAL(6, 5))
  declare employeeRate: string;

  @Column(DataType.DECIMAL(6, 5))
  declare companyRate: string;

  @Column(DataType.DECIMAL(15, 2))
  declare wageCap: string;

  @Column(DataType.DATEONLY)
  declare effectiveStartDate: string;

  @Column(DataType.DATEONLY)
  declare effectiveEndDate: string | null;

  @Column(DataType.UUID)
  declare createdBy: string;
}
