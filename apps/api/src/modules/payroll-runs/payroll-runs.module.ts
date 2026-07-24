import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PayrollCalculationJobModule } from '../../jobs/payroll-calculation.module';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollRunsService } from './payroll-runs.service';
import { PayrollRunsController } from './payroll-runs.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([PayrollRun]),
    // For PayrollCalculationQueue (the trigger). The job module does not import
    // back — no producer↔consumer cycle.
    PayrollCalculationJobModule,
  ],
  controllers: [PayrollRunsController],
  providers: [PayrollRunsService],
  exports: [PayrollRunsService],
})
export class PayrollRunsModule {}
