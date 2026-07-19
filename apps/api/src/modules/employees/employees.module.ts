import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmployeeTypesModule } from '../organization/employee-types/employee-types.module';
import { PositionsModule } from '../organization/positions/positions.module';
import { DepartmentsModule } from '../organization/departments/departments.module';
import { DivisionsModule } from '../organization/divisions/divisions.module';
import { PtkpModule } from '../ptkp/ptkp.module';
import { Employee } from './entities/employee.entity';
import { EmployeesService } from './employees.service';
import { EmployeesImportService } from './employees-import.service';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([Employee]),
    EmployeeTypesModule,
    PositionsModule,
    DepartmentsModule,
    DivisionsModule,
    PtkpModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesImportService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
