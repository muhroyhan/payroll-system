import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PayrollCalculationJobModule } from '../../jobs/payroll-calculation.module';
import { Payslip } from '../payslips/entities/payslip.entity';
import { PayslipLineItem } from '../payslips/entities/payslip-line-item.entity';
import { KasbonModule } from '../kasbon/kasbon.module';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollRunExcludedEmployee } from './entities/payroll-run-excluded-employee.entity';
import { PayrollRunsService } from './payroll-runs.service';
import { PayrollRunSummaryService } from './payroll-run-summary.service';
import { PayrollRunRevertService } from './payroll-run-revert.service';
import { PayrollRunsController } from './payroll-runs.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      PayrollRun,
      Payslip,
      PayslipLineItem,
      PayrollRunExcludedEmployee,
    ]),
    // For PayrollCalculationQueue (the trigger). The job module does not import
    // back — no producer↔consumer cycle.
    PayrollCalculationJobModule,
    // P8-T07 — KasbonService.reverseInstallmentsForRun, for revert teardown.
    KasbonModule,
  ],
  controllers: [PayrollRunsController],
  providers: [
    PayrollRunsService,
    PayrollRunSummaryService,
    PayrollRunRevertService,
  ],
  exports: [PayrollRunsService],
})
export class PayrollRunsModule {}
