import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PayslipComponent } from './entities/payslip-component.entity';
import { PayslipLineItem } from '../payslips/entities/payslip-line-item.entity';
import { PayslipComponentsService } from './payslip-components.service';
import { PayslipComponentsController } from './payslip-components.controller';

@Module({
  // PayslipLineItem is registered here (not imported via PayslipsModule) so
  // the immutability guard can query it directly — same lightweight pattern
  // PayslipReferenceModule already uses for the same table.
  imports: [SequelizeModule.forFeature([PayslipComponent, PayslipLineItem])],
  controllers: [PayslipComponentsController],
  providers: [PayslipComponentsService],
  exports: [PayslipComponentsService],
})
export class PayslipComponentsModule {}
