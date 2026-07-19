import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

// §8 — BPJS Ketenagakerjaan: JHT (no cap), JP (capped), JKK (company-only,
// risk-class dependent), JKM (company-only). Modeled as one rate card since
// admins update these together per effective period. Never hard-deleted (§11).
// JKP is intentionally not modeled — government/JKK-JKM funded, no payroll deduction.
@Table({
  tableName: 'bpjs_ketenagakerjaan_masters',
  underscored: true,
  timestamps: true,
})
export class BpjsKetenagakerjaanMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.DECIMAL(6, 5))
  declare jhtEmployeeRate: string;

  @Column(DataType.DECIMAL(6, 5))
  declare jhtCompanyRate: string;

  @Column(DataType.DECIMAL(6, 5))
  declare jpEmployeeRate: string;

  @Column(DataType.DECIMAL(6, 5))
  declare jpCompanyRate: string;

  @Column(DataType.DECIMAL(15, 2))
  declare jpWageCap: string;

  // Rate depends on the employer's risk class — single-tenant, so this stores
  // whatever rate applies to this company's own risk class, not a lookup of all classes.
  @Column(DataType.DECIMAL(6, 5))
  declare jkkCompanyRate: string;

  @Column(DataType.DECIMAL(6, 5))
  declare jkmCompanyRate: string;

  @Column(DataType.DATEONLY)
  declare effectiveStartDate: string;

  @Column(DataType.DATEONLY)
  declare effectiveEndDate: string | null;

  @Column(DataType.UUID)
  declare createdBy: string;
}
