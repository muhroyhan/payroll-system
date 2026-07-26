import { Module, OnModuleInit } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { AuditEntityType } from '@payroll-system/shared-types';
import { PayrollRun } from '../../modules/payroll-runs/entities/payroll-run.entity';
import { Employee } from '../../modules/employees/entities/employee.entity';
import { SalaryMaster } from '../../modules/salary-master/entities/salary-master.entity';
import { IncentiveMaster } from '../../modules/incentive-master/entities/incentive-master.entity';
import { PtkpMaster } from '../../modules/tax-bpjs-constants/ptkp-master/entities/ptkp-master.entity';
import { TerBracketMaster } from '../../modules/tax-bpjs-constants/ter-bracket-master/entities/ter-bracket-master.entity';
import { BpjsKesehatanMaster } from '../../modules/tax-bpjs-constants/bpjs-kesehatan-master/entities/bpjs-kesehatan-master.entity';
import { BpjsKetenagakerjaanMaster } from '../../modules/tax-bpjs-constants/bpjs-ketenagakerjaan-master/entities/bpjs-ketenagakerjaan-master.entity';
import { LeavePolicyMaster } from '../../modules/leave/leave-policy-master/entities/leave-policy-master.entity';
import { AuditEvent } from './entities/audit-event.entity';
import { registerAuditLog } from './audit-log.util';
import { AuditEventsService } from './audit-events.service';
import { AuditEventsController } from './audit-events.controller';

// Single source of truth for "what is audit-logged in this phase" — see the
// task's explicit scope: payroll_runs (every state transition), the 7
// effective-dated masters, and employees.ptkpManuallyOverridden. Adding a new
// audited entity later is one more @InjectModel + registerAuditLog() call
// here, not a change to that entity's own service/controller.
//
// Imports the entity classes directly (not their feature modules) purely to
// get an injectable model reference — avoids coupling AuditModule into each
// feature module's own dependency graph (ScopeResolverModule,
// PayslipReferenceModule, etc.), which it has no need of.
@Module({
  imports: [
    SequelizeModule.forFeature([
      AuditEvent,
      PayrollRun,
      Employee,
      SalaryMaster,
      IncentiveMaster,
      PtkpMaster,
      TerBracketMaster,
      BpjsKesehatanMaster,
      BpjsKetenagakerjaanMaster,
      LeavePolicyMaster,
    ]),
  ],
  controllers: [AuditEventsController],
  providers: [AuditEventsService],
})
export class AuditModule implements OnModuleInit {
  constructor(
    @InjectModel(PayrollRun) private readonly payrollRunModel: typeof PayrollRun,
    @InjectModel(Employee) private readonly employeeModel: typeof Employee,
    @InjectModel(SalaryMaster) private readonly salaryMasterModel: typeof SalaryMaster,
    @InjectModel(IncentiveMaster) private readonly incentiveMasterModel: typeof IncentiveMaster,
    @InjectModel(PtkpMaster) private readonly ptkpMasterModel: typeof PtkpMaster,
    @InjectModel(TerBracketMaster) private readonly terBracketMasterModel: typeof TerBracketMaster,
    @InjectModel(BpjsKesehatanMaster)
    private readonly bpjsKesehatanMasterModel: typeof BpjsKesehatanMaster,
    @InjectModel(BpjsKetenagakerjaanMaster)
    private readonly bpjsKetenagakerjaanMasterModel: typeof BpjsKetenagakerjaanMaster,
    @InjectModel(LeavePolicyMaster)
    private readonly leavePolicyMasterModel: typeof LeavePolicyMaster,
  ) {}

  onModuleInit(): void {
    // period/createdBy so the initial "run created" row is legible;
    // processedCount/totalCount excluded — they tick every calculation chunk
    // (payroll-calculation.processor.ts) and aren't a state transition.
    registerAuditLog(this.payrollRunModel, AuditEntityType.PAYROLL_RUN, {
      trackedFields: [
        'period',
        'status',
        'createdBy',
        'approvedBy',
        'disbursedBy',
        'lockedAt',
        'revertedBy',
        'revertReason',
      ],
    });

    // Scoped to the one dispute-sensitive field (§D) — not the rest of the
    // employee record (name/bank account/etc. are out of phase-1 scope).
    registerAuditLog(this.employeeModel, AuditEntityType.EMPLOYEE, {
      trackedFields: ['ptkpManuallyOverridden'],
    });

    // The 7 effective-dated masters — identical shape (see migration 0005),
    // whole-row tracking since every field on these is low-traffic and
    // dispute-relevant.
    registerAuditLog(this.salaryMasterModel, AuditEntityType.SALARY_MASTER);
    registerAuditLog(this.incentiveMasterModel, AuditEntityType.INCENTIVE_MASTER);
    registerAuditLog(this.ptkpMasterModel, AuditEntityType.PTKP_MASTER);
    registerAuditLog(this.terBracketMasterModel, AuditEntityType.TER_BRACKET_MASTER);
    registerAuditLog(this.bpjsKesehatanMasterModel, AuditEntityType.BPJS_KESEHATAN_MASTER);
    registerAuditLog(
      this.bpjsKetenagakerjaanMasterModel,
      AuditEntityType.BPJS_KETENAGAKERJAAN_MASTER,
    );
    registerAuditLog(this.leavePolicyMasterModel, AuditEntityType.LEAVE_POLICY_MASTER);
  }
}
