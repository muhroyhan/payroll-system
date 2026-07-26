import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PayrollRun } from '../../modules/payroll-runs/entities/payroll-run.entity';
import { Payslip } from '../../modules/payslips/entities/payslip.entity';
import { EffectiveRangePayslipChecker } from './effective-range-payslip-checker';

// Shared by every tax/BPJS constant master that needs the §11 lock but has no
// source_id trail in payslip_line_items (see effective-range-payslip-checker.ts)
// — one swap/registration point, same shape as PayslipReferenceModule.
// Registers PayrollRun/Payslip directly via forFeature rather than importing
// PayrollRunsModule/PayslipsModule, so this stays a leaf module with no risk of
// a cycle back into the tax-bpjs-constants modules that consume it.
@Module({
  imports: [SequelizeModule.forFeature([PayrollRun, Payslip])],
  providers: [EffectiveRangePayslipChecker],
  exports: [EffectiveRangePayslipChecker],
})
export class EffectiveRangePayslipCheckerModule {}
