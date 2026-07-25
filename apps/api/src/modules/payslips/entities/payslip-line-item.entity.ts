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
import { PayslipLineSource } from '@payroll-system/shared-types';
import { PayslipComponent } from '../../payslip-components/entities/payslip-component.entity';
import { Payslip } from './payslip.entity';

// §5.8 — the auditable breakdown of a payslip. `amount` is SIGNED (earnings +,
// deductions −), so Σ line items = net_pay. source + source_id trace each line
// back to the record that produced it and back the PayslipReferenceChecker
// lock (P4-T02/T03).
@Table({ tableName: 'payslip_line_items', underscored: true, timestamps: true })
export class PayslipLineItem extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Payslip)
  @Column(DataType.UUID)
  declare payslipId: string;

  @BelongsTo(() => Payslip)
  declare payslip: Payslip;

  // Populated for temp_component / sanction (map to a payslip_component_master
  // row); null for salary/incentive/kasbon/overtime/tax/bpjs.
  @ForeignKey(() => PayslipComponent)
  @Column(DataType.UUID)
  declare componentId: string | null;

  @BelongsTo(() => PayslipComponent)
  declare component: PayslipComponent | null;

  @Column(DataType.ENUM(...Object.values(PayslipLineSource)))
  declare source: PayslipLineSource;

  // Polymorphic (no FK); null for tax/bpjs computed lines.
  @Column(DataType.UUID)
  declare sourceId: string | null;

  @Column(DataType.DECIMAL(15, 2))
  declare amount: string;
}
