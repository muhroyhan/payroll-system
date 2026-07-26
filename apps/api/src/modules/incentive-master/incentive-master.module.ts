import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScopeResolverModule } from '../scope-resolver/scope-resolver.module';
import { EmployeesModule } from '../employees/employees.module';
import { PayslipReferenceModule } from '../../common/payslip-reference/payslip-reference.module';
import { IncentiveMaster } from './entities/incentive-master.entity';
import { IncentiveMasterService } from './incentive-master.service';
import { IncentiveMasterController } from './incentive-master.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([IncentiveMaster]),
    ScopeResolverModule,
    EmployeesModule,
    PayslipReferenceModule,
  ],
  controllers: [IncentiveMasterController],
  providers: [IncentiveMasterService],
  exports: [IncentiveMasterService],
})
export class IncentiveMasterModule {}
