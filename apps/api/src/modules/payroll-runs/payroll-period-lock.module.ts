import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollPeriodLockService } from './payroll-period-lock.service';

// A deliberately tiny module: just the PayrollRun model + the period-lock
// question. Kept separate from PayrollRunsModule so consumers that only need
// the §11 lock check (e.g. AttendanceModule) don't transitively pull in the
// BullMQ calculation queue — and so there's no import cycle back to the
// calculation side.
@Module({
  imports: [SequelizeModule.forFeature([PayrollRun])],
  providers: [PayrollPeriodLockService],
  exports: [PayrollPeriodLockService],
})
export class PayrollPeriodLockModule {}
