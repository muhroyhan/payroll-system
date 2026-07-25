import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

// §7/R7 — biaya jabatan constant (rate + monthly/annual cap), effective-dated.
// Seeded in P7-T02; consumed by the December annual true-up (P8-T04). Read-only
// entity (CRUD admin surface is out of scope here).
@Table({
  tableName: 'biaya_jabatan_masters',
  underscored: true,
  timestamps: true,
})
export class BiayaJabatanMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.DECIMAL(6, 5))
  declare rate: string;

  @Column(DataType.DECIMAL(15, 2))
  declare monthlyCap: string;

  @Column(DataType.DECIMAL(15, 2))
  declare annualCap: string;

  @Column(DataType.DATEONLY)
  declare effectiveStartDate: string;

  @Column(DataType.DATEONLY)
  declare effectiveEndDate: string | null;

  @Column(DataType.UUID)
  declare createdBy: string;
}
