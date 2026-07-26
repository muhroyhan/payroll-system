import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EffectiveRangePayslipCheckerModule } from '../../../common/effective-dating/effective-range-payslip-checker.module';
import { TerBracketMaster } from './entities/ter-bracket-master.entity';
import { TerBracketMasterService } from './ter-bracket-master.service';
import { TerBracketMasterController } from './ter-bracket-master.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([TerBracketMaster]),
    EffectiveRangePayslipCheckerModule,
  ],
  controllers: [TerBracketMasterController],
  providers: [TerBracketMasterService],
  exports: [TerBracketMasterService],
})
export class TerBracketMasterModule {}
