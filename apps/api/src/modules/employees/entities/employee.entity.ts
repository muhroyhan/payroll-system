import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import {
  EmployeeActiveStatus,
  EmploymentStatus,
  MaritalStatus,
  PtkpStatus,
} from '@payroll-system/shared-types';
import { EmployeeType } from '../../organization/employee-types/entities/employee-type.entity';
import { Position } from '../../organization/positions/entities/position.entity';
import { Department } from '../../organization/departments/entities/department.entity';
import { Division } from '../../organization/divisions/entities/division.entity';

// §5.1 — base_salary is intentionally NOT a column here; it's resolved from
// salary_master via the scope resolver (§5.2).
@Table({ tableName: 'employees', underscored: true, timestamps: true })
export class Employee extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.STRING)
  declare name: string;

  @Unique
  @Column(DataType.STRING)
  declare nik: string;

  @Unique
  @Column(DataType.STRING)
  declare npwp: string | null;

  // §5.1a — proposed/overridden result of the PTKP derivation service (P1-T06).
  @Column(DataType.ENUM(...Object.values(PtkpStatus)))
  declare ptkpStatus: PtkpStatus;

  @Column(DataType.ENUM(...Object.values(MaritalStatus)))
  declare maritalStatus: MaritalStatus;

  @Column(DataType.TINYINT)
  declare dependentCount: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare wifeIncomeCombined: boolean;

  // true once HR sets ptkp_status directly — derivation must not silently overwrite it (§5.1a).
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare ptkpManuallyOverridden: boolean;

  @Column(DataType.ENUM(...Object.values(EmploymentStatus)))
  declare employmentStatus: EmploymentStatus;

  @ForeignKey(() => EmployeeType)
  @Column(DataType.UUID)
  declare employeeTypeId: string;

  @BelongsTo(() => EmployeeType)
  declare employeeType: EmployeeType;

  @ForeignKey(() => Position)
  @Column(DataType.UUID)
  declare positionId: string;

  @BelongsTo(() => Position)
  declare position: Position;

  @ForeignKey(() => Department)
  @Column(DataType.UUID)
  declare departmentId: string;

  @BelongsTo(() => Department)
  declare department: Department;

  @ForeignKey(() => Division)
  @Column(DataType.UUID)
  declare divisionId: string;

  @BelongsTo(() => Division)
  declare division: Division;

  @Column(DataType.STRING)
  declare location: string | null;

  @Column(DataType.STRING)
  declare bankName: string | null;

  @Column(DataType.STRING)
  declare bankAccountNumber: string | null;

  @Column(DataType.STRING)
  declare bankAccountHolderName: string | null;

  @Column(DataType.DATEONLY)
  declare startDate: string;

  @Column(DataType.DATEONLY)
  declare endDate: string | null;

  @Default(EmployeeActiveStatus.ACTIVE)
  @Column(DataType.ENUM(...Object.values(EmployeeActiveStatus)))
  declare status: EmployeeActiveStatus;
}
