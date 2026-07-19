import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmployeeType } from './entities/employee-type.entity';
import { EmployeeTypesService } from './employee-types.service';
import { EmployeeTypesController } from './employee-types.controller';

@Module({
  imports: [SequelizeModule.forFeature([EmployeeType])],
  controllers: [EmployeeTypesController],
  providers: [EmployeeTypesService],
  exports: [EmployeeTypesService],
})
export class EmployeeTypesModule {}
