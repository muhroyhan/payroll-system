import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Role } from '@payroll-system/shared-types';

@Table({ tableName: 'users', underscored: true, timestamps: true })
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.STRING)
  declare name: string;

  @Unique
  @Column(DataType.STRING)
  declare email: string;

  @Column(DataType.STRING)
  declare passwordHash: string;

  @Column(DataType.ENUM(...Object.values(Role)))
  declare role: Role;

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;
}
