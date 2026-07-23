import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ScopeType } from '@payroll-system/shared-types';
import { EmployeeType } from '../organization/employee-types/entities/employee-type.entity';
import { Position } from '../organization/positions/entities/position.entity';
import { Department } from '../organization/departments/entities/department.entity';
import { Division } from '../organization/divisions/entities/division.entity';
import { Employee } from '../employees/entities/employee.entity';

// scope_value is polymorphic (points to a different table per scope_type), so a
// DB foreign key is impossible — this validates existence at the service layer
// before a scope master row is written. Prevents dangling scope rules that the
// resolver could never match, or worse, silently mis-match.
@Injectable()
export class ScopeValueValidator {
  constructor(
    @InjectModel(EmployeeType)
    private readonly employeeTypeModel: typeof EmployeeType,
    @InjectModel(Position) private readonly positionModel: typeof Position,
    @InjectModel(Department)
    private readonly departmentModel: typeof Department,
    @InjectModel(Division) private readonly divisionModel: typeof Division,
    @InjectModel(Employee) private readonly employeeModel: typeof Employee,
  ) {}

  async validate(scopeType: ScopeType, scopeValue: string): Promise<void> {
    const exists = await this.recordExists(scopeType, scopeValue);
    if (!exists) {
      throw new BadRequestException(
        `scopeValue "${scopeValue}" does not reference an existing ${scopeType}`,
      );
    }
  }

  private async recordExists(
    scopeType: ScopeType,
    scopeValue: string,
  ): Promise<boolean> {
    switch (scopeType) {
      case ScopeType.EMPLOYEE_TYPE:
        return (
          (await this.employeeTypeModel.count({ where: { id: scopeValue } })) >
          0
        );
      case ScopeType.POSITION:
        return (
          (await this.positionModel.count({ where: { id: scopeValue } })) > 0
        );
      case ScopeType.DEPARTMENT:
        return (
          (await this.departmentModel.count({ where: { id: scopeValue } })) > 0
        );
      case ScopeType.DIVISION:
        return (
          (await this.divisionModel.count({ where: { id: scopeValue } })) > 0
        );
      case ScopeType.EMPLOYEE:
        return (
          (await this.employeeModel.count({ where: { id: scopeValue } })) > 0
        );
    }
  }
}
