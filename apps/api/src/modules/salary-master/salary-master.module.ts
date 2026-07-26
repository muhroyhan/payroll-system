import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScopeResolverModule } from '../scope-resolver/scope-resolver.module';
import { EmployeesModule } from '../employees/employees.module';
import { PayslipReferenceModule } from '../../common/payslip-reference/payslip-reference.module';
import { SalaryMaster } from './entities/salary-master.entity';
import { SalaryMasterService } from './salary-master.service';
import { SalaryMasterController } from './salary-master.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([SalaryMaster]),
    ScopeResolverModule,
    EmployeesModule,
    PayslipReferenceModule,
  ],
  controllers: [SalaryMasterController],
  providers: [SalaryMasterService],
  exports: [SalaryMasterService],
})
export class SalaryMasterModule {}
