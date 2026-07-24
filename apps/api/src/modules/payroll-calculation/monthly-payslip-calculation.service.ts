import { Injectable } from '@nestjs/common';
import { PtkpStatus } from '@payroll-system/shared-types';
import { TerBracketMasterService } from '../tax-bpjs-constants/ter-bracket-master/ter-bracket-master.service';
import { BpjsKesehatanMasterService } from '../tax-bpjs-constants/bpjs-kesehatan-master/bpjs-kesehatan-master.service';
import { BpjsKetenagakerjaanMasterService } from '../tax-bpjs-constants/bpjs-ketenagakerjaan-master/bpjs-ketenagakerjaan-master.service';
import { resolveTerCategory } from '../tax-bpjs-constants/ter-bracket-master/ter-lookup';
import {
  MonthlyPph21Result,
  calculateMonthlyPph21,
} from './pph21-monthly.core';
import {
  BpjsEmployeeResult,
  calculateEmployeeBpjs,
} from './bpjs-employee.core';
import { isNpwpMissing } from './npwp';

export interface MonthlyCalculationInput {
  periodDate: string;
  taxableBruto: number;
  bpjsEligibleEarnings: number;
  ptkpStatus: PtkpStatus;
  // §5.1 — the employee's stored NPWP (nullable). The 20% surcharge (R4) is
  // derived from this field here, not passed as a pre-computed boolean, so the
  // wiring to employee data lives in one place.
  npwp: string | null;
}

export interface MonthlyCalculationResult {
  pph21: MonthlyPph21Result;
  bpjs: BpjsEmployeeResult;
}

// P7-T03 — Jan–Nov monthly calc for one employee: PPh21 (TER, §9 Step 4) and
// employee BPJS (§9 Step 3), computed independently. This is NOT the full
// payslip assembly (gross earnings resolution, other deductions, net pay, line
// items) — that's Phase 8. The December annual true-up is P7-T04.
@Injectable()
export class MonthlyPayslipCalculationService {
  constructor(
    private readonly terBracketMasterService: TerBracketMasterService,
    private readonly bpjsKesehatanMasterService: BpjsKesehatanMasterService,
    private readonly bpjsKetenagakerjaanMasterService: BpjsKetenagakerjaanMasterService,
  ) {}

  async calculateMonthly(
    input: MonthlyCalculationInput,
  ): Promise<MonthlyCalculationResult> {
    // §9 Step 4 — PPh21: TER on GROSS taxable. Fetch only this employee's
    // category brackets, active for the period. BPJS below does not touch this.
    const terCategory = resolveTerCategory(input.ptkpStatus);
    const brackets = await this.terBracketMasterService.resolveEffective(
      input.periodDate,
      terCategory,
    );
    const pph21 = calculateMonthlyPph21({
      taxableBruto: input.taxableBruto,
      ptkpStatus: input.ptkpStatus,
      brackets,
      npwpMissing: isNpwpMissing(input.npwp), // R4 — derived from employee data
    });

    // §9 Step 3 — employee BPJS, computed independently of the TER base above.
    const kesehatan = await this.bpjsKesehatanMasterService.resolveEffective(
      input.periodDate,
    );
    const ketenagakerjaan =
      await this.bpjsKetenagakerjaanMasterService.resolveEffective(
        input.periodDate,
      );
    const bpjs = calculateEmployeeBpjs(input.bpjsEligibleEarnings, {
      kesehatanRate: Number(kesehatan.employeeRate),
      kesehatanCap: Number(kesehatan.wageCap),
      jhtRate: Number(ketenagakerjaan.jhtEmployeeRate),
      jpRate: Number(ketenagakerjaan.jpEmployeeRate),
      jpCap: Number(ketenagakerjaan.jpWageCap),
    });

    return { pph21, bpjs };
  }
}
