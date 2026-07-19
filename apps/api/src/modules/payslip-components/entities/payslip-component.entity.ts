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
// componentType/isTaxable become immutable — that guard is added in P8-T07
// alongside payslip_line_items itself.
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
}
