import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SequelizeModule } from '@nestjs/sequelize';
import { Employee } from '../modules/employees/entities/employee.entity';
import { PayrollRun } from '../modules/payroll-runs/entities/payroll-run.entity';
import { PayrollCalculationModule } from '../modules/payroll-calculation/payroll-calculation.module';
import {
  PayrollCalculationQueue,
  PAYROLL_CALCULATION_QUEUE,
} from './payroll-calculation.queue';
import { PayrollCalculationProcessor } from './payroll-calculation.processor';

// P8-T02/T04 — the payroll calculation queue + worker. Imports
// PayrollCalculationModule for the P8-T04 PayrollRunCalculationService.
// Deliberately does NOT import PayrollRunsModule (the processor updates the
// PayrollRun model directly, via the pure transition guard) so there's no
// producer↔consumer cycle: PayrollRunsModule imports THIS module for the queue.
@Module({
  imports: [
    BullModule.registerQueue({ name: PAYROLL_CALCULATION_QUEUE }),
    SequelizeModule.forFeature([PayrollRun, Employee]),
    PayrollCalculationModule,
  ],
  providers: [PayrollCalculationQueue, PayrollCalculationProcessor],
  exports: [PayrollCalculationQueue],
})
export class PayrollCalculationJobModule {}
