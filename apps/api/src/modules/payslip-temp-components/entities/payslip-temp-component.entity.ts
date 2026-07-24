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
import { ScopeType } from '@payroll-system/shared-types';
import { PayslipComponent } from '../../payslip-components/entities/payslip-component.entity';

// §5.2 — one-off/period-specific payslip amounts (e.g. a one-time bonus or
// ad-hoc deduction), scoped via the SAME ScopeResolverService every other
// scope master uses (§3 — no parallel resolver). componentType/isTaxable are
// NOT duplicated here — always read live from the `component` association so
// this can never drift from payslip_component_master (Phase 8 uses it as-is).
//
// `periodYear`/`periodMonth` are this table's actual schema (§5.2) and stay
// the source of truth exposed over the API. `effectiveStartDate`/
// `effectiveEndDate` are derived (first/last day of that month) purely so
// this table can reuse ScopeResolverService.resolve(), which is generic over
// any ScopedEffectiveRecord — not a second resolution mechanism, just this
// table's period expressed in the shape the existing one already understands.
//
// No immutability guard here — 05_BOUNDARIES_AND_TESTS.md never mentions a
// lock for payslip_temp_components once used by a payslip_line_item (unlike
// surat_peringatan/overtime_letter/kasbon, which are explicit). Flagged as a
// documentation gap rather than assumed; add a PayslipReferenceChecker-style
// guard (source='temp_component') if/when Phase 8 confirms one is needed.
@Table({
  tableName: 'payslip_temp_components',
  underscored: true,
  timestamps: true,
})
export class PayslipTempComponent extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => PayslipComponent)
  @Column(DataType.UUID)
  declare componentId: string;

  @BelongsTo(() => PayslipComponent)
  declare component: PayslipComponent;

  @Column(DataType.ENUM(...Object.values(ScopeType)))
  declare scopeType: ScopeType;

  @Column(DataType.UUID)
  declare scopeValue: string;

  @Column(DataType.DECIMAL(15, 2))
  declare amount: string;

  @Column(DataType.INTEGER)
  declare periodYear: number;

  @Column(DataType.INTEGER)
  declare periodMonth: number;

  // Derived from periodYear/periodMonth — see class comment.
  @Column(DataType.DATEONLY)
  declare effectiveStartDate: string;

  @Column(DataType.DATEONLY)
  declare effectiveEndDate: string | null;

  @Column(DataType.UUID)
  declare createdBy: string;
}
