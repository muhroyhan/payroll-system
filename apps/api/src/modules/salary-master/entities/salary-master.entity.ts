import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { ScopeType } from '@payroll-system/shared-types';

// §5.2 Master Gaji Karyawan — base_salary resolved via the shared scope engine,
// effective-dated. Never hard-deleted (§11); retire a rule via effectiveEndDate.
@Table({ tableName: 'salary_masters', underscored: true, timestamps: true })
export class SalaryMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.ENUM(...Object.values(ScopeType)))
  declare scopeType: ScopeType;

  @Column(DataType.UUID)
  declare scopeValue: string;

  @Column(DataType.DECIMAL(15, 2))
  declare baseSalary: string;

  @Column(DataType.DATEONLY)
  declare effectiveStartDate: string;

  @Column(DataType.DATEONLY)
  declare effectiveEndDate: string | null;

  @Column(DataType.UUID)
  declare createdBy: string;
}
