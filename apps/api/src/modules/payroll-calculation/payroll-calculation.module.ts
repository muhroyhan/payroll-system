import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TerBracketMasterModule } from '../tax-bpjs-constants/ter-bracket-master/ter-bracket-master.module';
import { PtkpMasterModule } from '../tax-bpjs-constants/ptkp-master/ptkp-master.module';
import { BpjsKesehatanMasterModule } from '../tax-bpjs-constants/bpjs-kesehatan-master/bpjs-kesehatan-master.module';
import { BpjsKetenagakerjaanMasterModule } from '../tax-bpjs-constants/bpjs-ketenagakerjaan-master/bpjs-ketenagakerjaan-master.module';
import { EmployeesModule } from '../employees/employees.module';
import { KasbonModule } from '../kasbon/kasbon.module';
import { PayslipTempComponentsModule } from '../payslip-temp-components/payslip-temp-components.module';
import { Payslip } from '../payslips/entities/payslip.entity';
import { PayslipLineItem } from '../payslips/entities/payslip-line-item.entity';
import { SalaryMaster } from '../salary-master/entities/salary-master.entity';
import { IncentiveMaster } from '../incentive-master/entities/incentive-master.entity';
import { SuratPeringatan } from '../letters/surat-peringatan/entities/surat-peringatan.entity';
import { Kasbon } from '../kasbon/entities/kasbon.entity';
import { KasbonDeduction } from '../kasbon/entities/kasbon-deduction.entity';
import { BiayaJabatanMaster } from '../tax-bpjs-constants/biaya-jabatan-master/entities/biaya-jabatan-master.entity';
import { Pasal17BracketMaster } from '../tax-bpjs-constants/pasal17-bracket-master/entities/pasal17-bracket-master.entity';
import { MonthlyPayslipCalculationService } from './monthly-payslip-calculation.service';
import { PayrollRunCalculationService } from './payroll-run-calculation.service';

// P7-T03 monthly engine + P8-T04 full §9 per-employee assembly. The run
// calculation service consumes the scope masters, tax/BPJS constants, and the
// kasbon/temp-component/sanction sources, and persists payslips +
// payslip_line_items.
@Module({
  imports: [
    SequelizeModule.forFeature([
      Payslip,
      PayslipLineItem,
      SalaryMaster,
      IncentiveMaster,
      SuratPeringatan,
      Kasbon,
      KasbonDeduction,
      BiayaJabatanMaster,
      Pasal17BracketMaster,
    ]),
    TerBracketMasterModule,
    PtkpMasterModule,
    BpjsKesehatanMasterModule,
    BpjsKetenagakerjaanMasterModule,
    EmployeesModule,
    KasbonModule,
    PayslipTempComponentsModule,
  ],
  providers: [MonthlyPayslipCalculationService, PayrollRunCalculationService],
  exports: [MonthlyPayslipCalculationService, PayrollRunCalculationService],
})
export class PayrollCalculationModule {}
