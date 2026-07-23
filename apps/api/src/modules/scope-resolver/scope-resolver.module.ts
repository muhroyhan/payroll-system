import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmployeeType } from '../organization/employee-types/entities/employee-type.entity';
import { Position } from '../organization/positions/entities/position.entity';
import { Department } from '../organization/departments/entities/department.entity';
import { Division } from '../organization/divisions/entities/division.entity';
import { Employee } from '../employees/entities/employee.entity';
import { ScopeResolverService } from './scope-resolver.service';
import { ScopeValueValidator } from './scope-value-validator.service';

// Stateless, model-generic resolver + a scope_value existence validator. Every
// scope master module imports this and calls the one shared ScopeResolverService
// (§3 architecture rule).
@Module({
  imports: [
    SequelizeModule.forFeature([
      EmployeeType,
      Position,
      Department,
      Division,
      Employee,
    ]),
  ],
  providers: [ScopeResolverService, ScopeValueValidator],
  exports: [ScopeResolverService, ScopeValueValidator],
})
export class ScopeResolverModule {}
