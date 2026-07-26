import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { TerCategory } from '@payroll-system/shared-types';

// §7 — TER bracket table (rate by category A/B/C and gross monthly income
// bound), effective-dated. Never hard-deleted (§11).
@Table({
  tableName: 'ter_bracket_masters',
  underscored: true,
  timestamps: true,
})
export class TerBracketMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.ENUM(...Object.values(TerCategory)))
  declare terCategory: TerCategory;

  @Column(DataType.DECIMAL(15, 2))
  declare incomeLowerBound: string;

  // null = highest bracket (no upper bound)
  @Column(DataType.DECIMAL(15, 2))
  declare incomeUpperBound: string | null;

  // fraction, e.g. 0.05 = 5%
  @Column(DataType.DECIMAL(6, 5))
  declare rate: string;

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
