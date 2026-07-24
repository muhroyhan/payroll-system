import { Module } from '@nestjs/common';
import { TerBracketMasterModule } from '../tax-bpjs-constants/ter-bracket-master/ter-bracket-master.module';
import { BpjsKesehatanMasterModule } from '../tax-bpjs-constants/bpjs-kesehatan-master/bpjs-kesehatan-master.module';
import { BpjsKetenagakerjaanMasterModule } from '../tax-bpjs-constants/bpjs-ketenagakerjaan-master/bpjs-ketenagakerjaan-master.module';
import { MonthlyPayslipCalculationService } from './monthly-payslip-calculation.service';

// P7-T03 — the monthly (Jan–Nov) tax/BPJS calculation engine. Consumes the
// effective-dated constant services; Phase 8's payroll run will consume this.
@Module({
  imports: [
    TerBracketMasterModule,
    BpjsKesehatanMasterModule,
    BpjsKetenagakerjaanMasterModule,
  ],
  providers: [MonthlyPayslipCalculationService],
  exports: [MonthlyPayslipCalculationService],
})
export class PayrollCalculationModule {}
