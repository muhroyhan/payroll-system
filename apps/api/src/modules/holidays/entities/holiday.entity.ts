import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { HolidaySource } from '@payroll-system/shared-types';

// §5.7 — holidays master. Seeded/synced from the Google Calendar Indonesian
// feed, plus manual company off-days (cuti bersama, anniversary). Unlike the
// tax/scope masters, holidays ARE freely editable/deletable by users.
// `date` is unique so sync can upsert by date.
@Table({ tableName: 'holidays', underscored: true, timestamps: true })
export class Holiday extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @Column(DataType.DATEONLY)
  declare date: string;

  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.ENUM(...Object.values(HolidaySource)))
  declare source: HolidaySource;

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;
}
