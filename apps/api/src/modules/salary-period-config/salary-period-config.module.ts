import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SalaryPeriodConfig } from './entities/salary-period-config.entity';
import { SalaryPeriodConfigService } from './salary-period-config.service';
import { SalaryPeriodConfigController } from './salary-period-config.controller';

@Module({
  imports: [SequelizeModule.forFeature([SalaryPeriodConfig])],
  controllers: [SalaryPeriodConfigController],
  providers: [SalaryPeriodConfigService],
  exports: [SalaryPeriodConfigService],
})
export class SalaryPeriodConfigModule {}
