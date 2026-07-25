import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import { PayrollRun } from './entities/payroll-run.entity';

// §11 / TC-PAYROLL-04 (P8-T07) — source data for a period (attendance_records
// today; the same rule covers fingerprints) is locked the moment that period
// has a payroll run past `draft`. Editing must wait until the run is reverted
// to draft — which is only possible while `calculated`, never once approved/
// disbursed. This is a shared, single source of truth for that question so the
// scope-resolution / lock-checking logic isn't reimplemented per consumer (§3).
@Injectable()
export class PayrollPeriodLockService {
  constructor(
    @InjectModel(PayrollRun)
    private readonly payrollRunModel: typeof PayrollRun,
  ) {}

  // A period ('YYYY-MM') is locked if any run for it is past draft.
  async isPeriodLocked(period: string): Promise<boolean> {
    const count = await this.payrollRunModel.count({
      where: { period, status: { [Op.ne]: PayrollRunStatus.DRAFT } },
    });
    return count > 0;
  }

  async assertPeriodEditable(period: string): Promise<void> {
    if (await this.isPeriodLocked(period)) {
      throw new ConflictException(
        `Source data for period ${period} is locked — its payroll run is past ` +
          `draft (§11). Revert the run to draft before editing this period.`,
      );
    }
  }
}
