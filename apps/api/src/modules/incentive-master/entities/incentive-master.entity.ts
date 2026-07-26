import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { ScopeType } from '@payroll-system/shared-types';

// §5.2 Master Insentif — same shape as salary_master, resolved via the shared
// scope engine, effective-dated. Never hard-deleted (§11).
@Table({ tableName: 'incentive_masters', underscored: true, timestamps: true })
export class IncentiveMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.ENUM(...Object.values(ScopeType)))
  declare scopeType: ScopeType;

  @Column(DataType.UUID)
  declare scopeValue: string;

  @Column(DataType.DECIMAL(15, 2))
  declare incentiveAmount: string;

  // §9 Step 2 — whether this incentive counts toward the BPJS wage base. Added
  // P8-T04b (same data-driven pattern as payslip_component_master's
  // is_bpjs_eligible, P7-T06b): fixed/recurring allowances → true, variable/
  // one-off incentives → false. Read by the payroll run, never hardcoded (§3).
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isBpjsEligible: boolean;

  @Column(DataType.DATEONLY)
  declare effectiveStartDate: string;

  @Column(DataType.DATEONLY)
  declare effectiveEndDate: string | null;

  @Column(DataType.UUID)
  declare createdBy: string;

  @Column(DataType.UUID)
  declare updatedBy: string | null;

  @Column(DataType.TEXT)
  declare reason: string | null;

  @Column(DataType.UUID)
  declare supersedesId: string | null;
}
