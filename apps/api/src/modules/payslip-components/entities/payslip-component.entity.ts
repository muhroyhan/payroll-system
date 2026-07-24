import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { PayslipComponentType } from '@payroll-system/shared-types';

// §5.2 — payslip_component_master. Never hard-deleted (§11); retire by ceasing
// to reference it. Once referenced by a payslip_line_items row (Phase 8),
// componentType/isTaxable/isBpjsEligible become immutable — that guard is
// added in P8-T07 alongside payslip_line_items itself.
@Table({ tableName: 'payslip_components', underscored: true, timestamps: true })
export class PayslipComponent extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.ENUM(...Object.values(PayslipComponentType)))
  declare componentType: PayslipComponentType;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isTaxable: boolean;

  // §9 Step 2 — whether this component counts toward the BPJS wage base
  // (Kesehatan/JHT/JP). Added P7-T06b to close a documented gap: BPJS
  // eligibility is data-driven per component, exactly like isTaxable — never
  // hardcoded per component kind in application code (§3).
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isBpjsEligible: boolean;
}
