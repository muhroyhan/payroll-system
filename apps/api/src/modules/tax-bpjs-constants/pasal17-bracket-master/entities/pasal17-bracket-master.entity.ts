import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

// §7/R7 — progressive Pasal 17 bracket (UU HPP), effective-dated. Same
// inclusive-bounds shape as ter_bracket_masters. Seeded in P7-T02; consumed by
// the December annual true-up (P8-T04). Read-only entity here.
@Table({
  tableName: 'pasal17_bracket_masters',
  underscored: true,
  timestamps: true,
})
export class Pasal17BracketMaster extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.DECIMAL(15, 2))
  declare incomeLowerBound: string;

  @Column(DataType.DECIMAL(15, 2))
  declare incomeUpperBound: string | null;

  @Column(DataType.DECIMAL(6, 5))
  declare rate: string;

  @Column(DataType.DATEONLY)
  declare effectiveStartDate: string;

  @Column(DataType.DATEONLY)
  declare effectiveEndDate: string | null;

  @Column(DataType.UUID)
  declare createdBy: string;
}
