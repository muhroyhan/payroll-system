import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PayslipComponent } from './entities/payslip-component.entity';
import { PayslipComponentsService } from './payslip-components.service';
import { PayslipComponentsController } from './payslip-components.controller';

@Module({
  imports: [SequelizeModule.forFeature([PayslipComponent])],
  controllers: [PayslipComponentsController],
  providers: [PayslipComponentsService],
  exports: [PayslipComponentsService],
})
export class PayslipComponentsModule {}
