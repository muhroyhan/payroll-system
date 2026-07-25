import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PayrollCalculationJobModule } from '../../jobs/payroll-calculation.module';
import { Payslip } from '../payslips/entities/payslip.entity';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollRunsService } from './payroll-runs.service';
import { PayrollRunSummaryService } from './payroll-run-summary.service';
import { PayrollRunsController } from './payroll-runs.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([PayrollRun, Payslip]),
    // For PayrollCalculationQueue (the trigger). The job module does not import
    // back — no producer↔consumer cycle.
    PayrollCalculationJobModule,
  ],
  controllers: [PayrollRunsController],
  providers: [PayrollRunsService, PayrollRunSummaryService],
  exports: [PayrollRunsService],
})
export class PayrollRunsModule {}
