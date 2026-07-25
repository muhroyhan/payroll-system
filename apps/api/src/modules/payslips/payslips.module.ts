import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Payslip } from './entities/payslip.entity';
import { PayslipLineItem } from './entities/payslip-line-item.entity';
import { PayslipsService } from './payslips.service';
import { PayslipsController } from './payslips.controller';

@Module({
  imports: [SequelizeModule.forFeature([Payslip, PayslipLineItem])],
  controllers: [PayslipsController],
  providers: [PayslipsService],
  exports: [SequelizeModule],
})
export class PayslipsModule {}
