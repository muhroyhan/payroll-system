import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SequelizeModule } from '@nestjs/sequelize';
import { Employee } from '../modules/employees/entities/employee.entity';
import { PayrollRun } from '../modules/payroll-runs/entities/payroll-run.entity';
import {
  PayrollCalculationQueue,
  PAYROLL_CALCULATION_QUEUE,
} from './payroll-calculation.queue';
import { PayrollCalculationProcessor } from './payroll-calculation.processor';

// P8-T02 — the payroll calculation queue + worker. Deliberately does NOT import
// PayrollRunsModule (the processor updates the PayrollRun model directly, via
// the pure transition guard) so there's no producer↔consumer module cycle:
// PayrollRunsModule imports THIS module for the queue; this module imports
// nothing back.
@Module({
  imports: [
    BullModule.registerQueue({ name: PAYROLL_CALCULATION_QUEUE }),
    SequelizeModule.forFeature([PayrollRun, Employee]),
  ],
  providers: [PayrollCalculationQueue, PayrollCalculationProcessor],
  exports: [PayrollCalculationQueue],
})
export class PayrollCalculationJobModule {}
