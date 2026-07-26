import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EffectiveRangePayslipCheckerModule } from '../../../common/effective-dating/effective-range-payslip-checker.module';
import { BpjsKesehatanMaster } from './entities/bpjs-kesehatan-master.entity';
import { BpjsKesehatanMasterService } from './bpjs-kesehatan-master.service';
import { BpjsKesehatanMasterController } from './bpjs-kesehatan-master.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([BpjsKesehatanMaster]),
    EffectiveRangePayslipCheckerModule,
  ],
  controllers: [BpjsKesehatanMasterController],
  providers: [BpjsKesehatanMasterService],
  exports: [BpjsKesehatanMasterService],
})
export class BpjsKesehatanMasterModule {}
