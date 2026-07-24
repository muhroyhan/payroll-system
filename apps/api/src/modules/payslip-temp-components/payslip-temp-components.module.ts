import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScopeResolverModule } from '../scope-resolver/scope-resolver.module';
import { EmployeesModule } from '../employees/employees.module';
import { PayslipTempComponent } from './entities/payslip-temp-component.entity';
import { PayslipTempComponentsService } from './payslip-temp-components.service';
import { PayslipTempComponentsController } from './payslip-temp-components.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([PayslipTempComponent]),
    ScopeResolverModule,
    EmployeesModule,
  ],
  controllers: [PayslipTempComponentsController],
  providers: [PayslipTempComponentsService],
  exports: [PayslipTempComponentsService],
})
export class PayslipTempComponentsModule {}
