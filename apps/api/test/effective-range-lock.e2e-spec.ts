import { ConflictException, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import {
  EmployeeActiveStatus,
  EmploymentStatus,
  Gender,
  MaritalStatus,
  PayrollRunStatus,
  PayslipLineSource,
  PtkpStatus,
  ScopeType,
  TerCategory,
} from '@payroll-system/shared-types';
import databaseConfig from '../src/config/database.config';
import { envValidationSchema } from '../src/config/env-validation.schema';
import { PtkpMasterModule } from '../src/modules/tax-bpjs-constants/ptkp-master/ptkp-master.module';
import { TerBracketMasterModule } from '../src/modules/tax-bpjs-constants/ter-bracket-master/ter-bracket-master.module';
import { BpjsKesehatanMasterModule } from '../src/modules/tax-bpjs-constants/bpjs-kesehatan-master/bpjs-kesehatan-master.module';
import { BpjsKetenagakerjaanMasterModule } from '../src/modules/tax-bpjs-constants/bpjs-ketenagakerjaan-master/bpjs-ketenagakerjaan-master.module';
import { SalaryMasterModule } from '../src/modules/salary-master/salary-master.module';
import { IncentiveMasterModule } from '../src/modules/incentive-master/incentive-master.module';
import { LeaveModule } from '../src/modules/leave/leave.module';
import { PtkpMasterService } from '../src/modules/tax-bpjs-constants/ptkp-master/ptkp-master.service';
import { TerBracketMasterService } from '../src/modules/tax-bpjs-constants/ter-bracket-master/ter-bracket-master.service';
import { BpjsKesehatanMasterService } from '../src/modules/tax-bpjs-constants/bpjs-kesehatan-master/bpjs-kesehatan-master.service';
import { BpjsKetenagakerjaanMasterService } from '../src/modules/tax-bpjs-constants/bpjs-ketenagakerjaan-master/bpjs-ketenagakerjaan-master.service';
import { SalaryMasterService } from '../src/modules/salary-master/salary-master.service';
import { IncentiveMasterService } from '../src/modules/incentive-master/incentive-master.service';
import { LeavePolicyMasterService } from '../src/modules/leave/leave-policy-master/leave-policy-master.service';
import { PtkpMaster } from '../src/modules/tax-bpjs-constants/ptkp-master/entities/ptkp-master.entity';
import { TerBracketMaster } from '../src/modules/tax-bpjs-constants/ter-bracket-master/entities/ter-bracket-master.entity';
import { BpjsKesehatanMaster } from '../src/modules/tax-bpjs-constants/bpjs-kesehatan-master/entities/bpjs-kesehatan-master.entity';
import { BpjsKetenagakerjaanMaster } from '../src/modules/tax-bpjs-constants/bpjs-ketenagakerjaan-master/entities/bpjs-ketenagakerjaan-master.entity';
import { SalaryMaster } from '../src/modules/salary-master/entities/salary-master.entity';
import { IncentiveMaster } from '../src/modules/incentive-master/entities/incentive-master.entity';
import { LeavePolicyMaster } from '../src/modules/leave/leave-policy-master/entities/leave-policy-master.entity';
import { LeaveBalance } from '../src/modules/leave/leave-balances/entities/leave-balance.entity';
import { LeaveType } from '../src/modules/leave/leave-types/entities/leave-type.entity';
import { Employee } from '../src/modules/employees/entities/employee.entity';
import { EmployeeType } from '../src/modules/organization/employee-types/entities/employee-type.entity';
import { Position } from '../src/modules/organization/positions/entities/position.entity';
import { Department } from '../src/modules/organization/departments/entities/department.entity';
import { Division } from '../src/modules/organization/divisions/entities/division.entity';
import { PayrollRun } from '../src/modules/payroll-runs/entities/payroll-run.entity';
import { PayrollRunExcludedEmployee } from '../src/modules/payroll-runs/entities/payroll-run-excluded-employee.entity';
import { Payslip } from '../src/modules/payslips/entities/payslip.entity';
import { PayslipLineItem } from '../src/modules/payslips/entities/payslip-line-item.entity';
import { PayslipComponent } from '../src/modules/payslip-components/entities/payslip-component.entity';
import { User } from '../src/modules/users/entities/user.entity';

// Deliberately NOT AppModule: AppModule transitively imports pdf-generation
// -> puppeteer, which is ESM-only and breaks ts-jest ("Unexpected token
// 'export'") — a pre-existing repo issue, reproducible with the stock
// app.e2e-spec.ts too, unrelated to this fix. This module wires only what the
// six services under test actually need (DB connection + their own leaf
// modules), so it stays on the real Sequelize/MySQL path without dragging in
// PDF rendering.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'mysql' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        logging: config.get<boolean>('database.logging'),
        autoLoadModels: true,
        synchronize: false,
      }),
    }),
    // PayslipComponent is otherwise unused here, but PayslipLineItem's
    // @BelongsTo(() => PayslipComponent) needs the class registered in this
    // Sequelize instance or model association wiring throws at boot. Same
    // reason for PayrollRunExcludedEmployee: PayrollRun's
    // @HasMany(() => PayrollRunExcludedEmployee) (added for Task B) needs it
    // registered here too, or Sequelize.addModels throws "...has not been
    // defined" for every module that imports PayrollRun — exactly this
    // class of bug, just one hop further out. User is the same story, one
    // hop further still: PayrollRun's own @BelongsTo(() => User,
    // 'disbursedBy') surfaced once LeaveModule's extra import graph shifted
    // model-registration order enough for this one to actually get hit.
    SequelizeModule.forFeature([PayslipComponent, PayrollRunExcludedEmployee, User]),
    PtkpMasterModule,
    TerBracketMasterModule,
    BpjsKesehatanMasterModule,
    BpjsKetenagakerjaanMasterModule,
    SalaryMasterModule,
    IncentiveMasterModule,
    LeaveModule,
  ],
})
class LockTestModule {}

// Regression coverage for the bug found in the big-test report §3: every
// service below calls EffectiveRangePayslipChecker.isReferenced(), which
// does `PayrollRun.findAll({ include: [{ model: Payslip }] })`. That include
// requires a real Sequelize @HasMany(() => Payslip) on PayrollRun — the six
// existing *.service.spec.ts files all mock EffectiveRangePayslipChecker
// entirely, so a missing/broken association there would (and did) throw
// EagerLoadingError -> 500 in production while every unit test stayed green.
// These tests use the real DB, the real checker, and a real payroll_runs +
// payslips row per case — no mocking of EffectiveRangePayslipChecker or
// PayslipReferenceChecker anywhere in this file.
describe('Effective-dated master locks (integration, real DB)', () => {
  const TEST_PERIOD = '2029-01';
  const TEST_PERIOD_DATE = `${TEST_PERIOD}-01`;
  const createdIds = {
    payslipLineItems: [] as string[],
    payslips: [] as string[],
    payrollRuns: [] as string[],
    salaryMasters: [] as string[],
    incentiveMasters: [] as string[],
    ptkpMasters: [] as string[],
    terBracketMasters: [] as string[],
    bpjsKesehatanMasters: [] as string[],
    bpjsKetenagakerjaanMasters: [] as string[],
    leavePolicyMasters: [] as string[],
    leaveBalances: [] as string[],
    leaveTypes: [] as string[],
    employees: [] as string[],
    employeeTypeId: '',
    positionId: '',
    departmentId: '',
    divisionId: '',
  };

  let moduleRef: TestingModule;
  let ptkpMasterService: PtkpMasterService;
  let terBracketMasterService: TerBracketMasterService;
  let bpjsKesehatanMasterService: BpjsKesehatanMasterService;
  let bpjsKetenagakerjaanMasterService: BpjsKetenagakerjaanMasterService;
  let salaryMasterService: SalaryMasterService;
  let incentiveMasterService: IncentiveMasterService;
  let leavePolicyMasterService: LeavePolicyMasterService;

  let ptkpMasterModel: typeof PtkpMaster;
  let terBracketMasterModel: typeof TerBracketMaster;
  let bpjsKesehatanMasterModel: typeof BpjsKesehatanMaster;
  let bpjsKetenagakerjaanMasterModel: typeof BpjsKetenagakerjaanMaster;
  let salaryMasterModel: typeof SalaryMaster;
  let incentiveMasterModel: typeof IncentiveMaster;
  let leavePolicyMasterModel: typeof LeavePolicyMaster;
  let leaveBalanceModel: typeof LeaveBalance;
  let leaveTypeModel: typeof LeaveType;
  let employeeModel: typeof Employee;
  let employeeTypeModel: typeof EmployeeType;
  let positionModel: typeof Position;
  let departmentModel: typeof Department;
  let divisionModel: typeof Division;
  let payrollRunModel: typeof PayrollRun;
  let payslipModel: typeof Payslip;
  let payslipLineItemModel: typeof PayslipLineItem;

  // One employee whose ptkpStatus is TK/0 (TER category A) so the ptkp-master
  // and ter-bracket-master category-matched lock has something real to match.
  let employeeId: string;
  let payrollRunId: string;
  let payslipId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [LockTestModule],
    }).compile();

    ptkpMasterService = moduleRef.get(PtkpMasterService);
    terBracketMasterService = moduleRef.get(TerBracketMasterService);
    bpjsKesehatanMasterService = moduleRef.get(BpjsKesehatanMasterService);
    bpjsKetenagakerjaanMasterService = moduleRef.get(
      BpjsKetenagakerjaanMasterService,
    );
    salaryMasterService = moduleRef.get(SalaryMasterService);
    incentiveMasterService = moduleRef.get(IncentiveMasterService);
    leavePolicyMasterService = moduleRef.get(LeavePolicyMasterService);

    ptkpMasterModel = moduleRef.get(getModelToken(PtkpMaster));
    terBracketMasterModel = moduleRef.get(getModelToken(TerBracketMaster));
    bpjsKesehatanMasterModel = moduleRef.get(
      getModelToken(BpjsKesehatanMaster),
    );
    bpjsKetenagakerjaanMasterModel = moduleRef.get(
      getModelToken(BpjsKetenagakerjaanMaster),
    );
    salaryMasterModel = moduleRef.get(getModelToken(SalaryMaster));
    incentiveMasterModel = moduleRef.get(getModelToken(IncentiveMaster));
    leavePolicyMasterModel = moduleRef.get(getModelToken(LeavePolicyMaster));
    leaveBalanceModel = moduleRef.get(getModelToken(LeaveBalance));
    leaveTypeModel = moduleRef.get(getModelToken(LeaveType));
    employeeModel = moduleRef.get(getModelToken(Employee));
    employeeTypeModel = moduleRef.get(getModelToken(EmployeeType));
    positionModel = moduleRef.get(getModelToken(Position));
    departmentModel = moduleRef.get(getModelToken(Department));
    divisionModel = moduleRef.get(getModelToken(Division));
    payrollRunModel = moduleRef.get(getModelToken(PayrollRun));
    payslipModel = moduleRef.get(getModelToken(Payslip));
    payslipLineItemModel = moduleRef.get(getModelToken(PayslipLineItem));

    const employeeType = await employeeTypeModel.create({
      name: `LockTest EmployeeType ${randomUUID()}`,
    } as any);
    const position = await positionModel.create({
      name: `LockTest Position ${randomUUID()}`,
    } as any);
    const department = await departmentModel.create({
      name: `LockTest Department ${randomUUID()}`,
    } as any);
    const division = await divisionModel.create({
      name: `LockTest Division ${randomUUID()}`,
    } as any);
    createdIds.employeeTypeId = employeeType.id;
    createdIds.positionId = position.id;
    createdIds.departmentId = department.id;
    createdIds.divisionId = division.id;

    const employee = await employeeModel.create({
      name: 'LockTest Employee',
      nik: `9${Date.now()}`.slice(0, 16).padEnd(16, '0'),
      npwp: null,
      ptkpStatus: PtkpStatus.TK_0,
      maritalStatus: MaritalStatus.SINGLE,
      gender: Gender.MALE,
      dependentCount: 0,
      ptkpManuallyOverridden: true,
      employmentStatus: EmploymentStatus.TETAP,
      employeeTypeId: employeeType.id,
      positionId: position.id,
      departmentId: department.id,
      divisionId: division.id,
      startDate: '2029-01-01',
      status: EmployeeActiveStatus.ACTIVE,
    } as any);
    employeeId = employee.id;
    createdIds.employees.push(employeeId);

    const payrollRun = await payrollRunModel.create({
      period: TEST_PERIOD,
      status: PayrollRunStatus.CALCULATED,
      createdBy: randomUUID(),
    } as any);
    payrollRunId = payrollRun.id;
    createdIds.payrollRuns.push(payrollRunId);

    const zero = '0.00';
    const payslip = await payslipModel.create({
      payrollRunId,
      employeeId,
      grossPay: zero,
      taxableGross: zero,
      pph21Amount: zero,
      bpjsKesehatanEmployee: zero,
      bpjsKesehatanCompany: zero,
      bpjsJhtEmployee: zero,
      bpjsJhtCompany: zero,
      bpjsJpEmployee: zero,
      bpjsJpCompany: zero,
      bpjsJkkCompany: zero,
      bpjsJkmCompany: zero,
      netPay: zero,
    } as any);
    payslipId = payslip.id;
    createdIds.payslips.push(payslipId);
  });

  afterAll(async () => {
    // Child -> parent, same order as PayrollRunRevertService.
    await payslipLineItemModel.destroy({
      where: { id: createdIds.payslipLineItems },
      force: true,
    });
    await payslipModel.destroy({
      where: { id: createdIds.payslips },
      force: true,
    });
    await payrollRunModel.destroy({
      where: { id: createdIds.payrollRuns },
      force: true,
    });
    await salaryMasterModel.destroy({
      where: { id: createdIds.salaryMasters },
      force: true,
    });
    await incentiveMasterModel.destroy({
      where: { id: createdIds.incentiveMasters },
      force: true,
    });
    await ptkpMasterModel.destroy({
      where: { id: createdIds.ptkpMasters },
      force: true,
    });
    await terBracketMasterModel.destroy({
      where: { id: createdIds.terBracketMasters },
      force: true,
    });
    await bpjsKesehatanMasterModel.destroy({
      where: { id: createdIds.bpjsKesehatanMasters },
      force: true,
    });
    await bpjsKetenagakerjaanMasterModel.destroy({
      where: { id: createdIds.bpjsKetenagakerjaanMasters },
      force: true,
    });
    // leave_balances references both leave_policy_masters and leave_types —
    // destroy it first, then the policy rows, then the types.
    await leaveBalanceModel.destroy({
      where: { id: createdIds.leaveBalances },
      force: true,
    });
    await leavePolicyMasterModel.destroy({
      where: { id: createdIds.leavePolicyMasters },
      force: true,
    });
    await leaveTypeModel.destroy({
      where: { id: createdIds.leaveTypes },
      force: true,
    });
    await employeeModel.destroy({
      where: { id: createdIds.employees },
      force: true,
    });
    await employeeTypeModel.destroy({
      where: { id: createdIds.employeeTypeId },
      force: true,
    });
    await positionModel.destroy({
      where: { id: createdIds.positionId },
      force: true,
    });
    await departmentModel.destroy({
      where: { id: createdIds.departmentId },
      force: true,
    });
    await divisionModel.destroy({
      where: { id: createdIds.divisionId },
      force: true,
    });

    await moduleRef.close();
  });

  it('ptkp-master: rejects editing amount once a same-ptkpStatus payslip exists in the covered period', async () => {
    const row = await ptkpMasterModel.create({
      ptkpStatus: PtkpStatus.TK_0,
      amount: '54000000.00',
      effectiveStartDate: TEST_PERIOD_DATE,
      effectiveEndDate: null,
      createdBy: randomUUID(),
    } as any);
    createdIds.ptkpMasters.push(row.id);

    await expect(
      ptkpMasterService.update(
        row.id,
        { amount: '99999999.00' } as any,
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('ter-bracket-master: rejects editing rate once a payslip for a category-A employee exists in the covered period', async () => {
    const row = await terBracketMasterModel.create({
      terCategory: TerCategory.A,
      incomeLowerBound: '0.00',
      incomeUpperBound: null,
      rate: '0.05000',
      effectiveStartDate: TEST_PERIOD_DATE,
      effectiveEndDate: null,
      createdBy: randomUUID(),
    } as any);
    createdIds.terBracketMasters.push(row.id);

    await expect(
      terBracketMasterService.update(
        row.id,
        { rate: '0.99999' } as any,
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('bpjs-kesehatan-master: rejects editing employeeRate once any payslip exists in the covered period', async () => {
    const row = await bpjsKesehatanMasterModel.create({
      employeeRate: '0.01000',
      companyRate: '0.04000',
      wageCap: '12000000.00',
      effectiveStartDate: TEST_PERIOD_DATE,
      effectiveEndDate: null,
      createdBy: randomUUID(),
    } as any);
    createdIds.bpjsKesehatanMasters.push(row.id);

    await expect(
      bpjsKesehatanMasterService.update(
        row.id,
        { employeeRate: '0.99000' } as any,
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('bpjs-ketenagakerjaan-master: rejects editing jkkCompanyRate once any payslip exists in the covered period (the exact bug from big-test report §3)', async () => {
    const row = await bpjsKetenagakerjaanMasterModel.create({
      jhtEmployeeRate: '0.02000',
      jhtCompanyRate: '0.03700',
      jpEmployeeRate: '0.01000',
      jpCompanyRate: '0.02000',
      jpWageCap: '11086300.00',
      jkkCompanyRate: '0.00240',
      jkmCompanyRate: '0.00300',
      effectiveStartDate: TEST_PERIOD_DATE,
      effectiveEndDate: null,
      createdBy: randomUUID(),
    } as any);
    createdIds.bpjsKetenagakerjaanMasters.push(row.id);

    await expect(
      bpjsKetenagakerjaanMasterService.update(
        row.id,
        { jkkCompanyRate: '0.99000' } as any,
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('salary-master: rejects editing baseSalary once resolved into a payslip line item', async () => {
    const row = await salaryMasterModel.create({
      scopeType: ScopeType.EMPLOYEE,
      scopeValue: employeeId,
      baseSalary: '5000000.00',
      effectiveStartDate: TEST_PERIOD_DATE,
      effectiveEndDate: null,
      createdBy: randomUUID(),
    } as any);
    createdIds.salaryMasters.push(row.id);

    const lineItem = await payslipLineItemModel.create({
      payslipId,
      componentId: null,
      source: PayslipLineSource.SALARY_MASTER,
      sourceId: row.id,
      amount: '5000000.00',
    } as any);
    createdIds.payslipLineItems.push(lineItem.id);

    await expect(
      salaryMasterService.update(
        row.id,
        { baseSalary: '9999999.00' } as any,
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('incentive-master: rejects editing incentiveAmount once resolved into a payslip line item', async () => {
    const row = await incentiveMasterModel.create({
      scopeType: ScopeType.EMPLOYEE,
      scopeValue: employeeId,
      incentiveAmount: '1000000.00',
      isBpjsEligible: true,
      effectiveStartDate: TEST_PERIOD_DATE,
      effectiveEndDate: null,
      createdBy: randomUUID(),
    } as any);
    createdIds.incentiveMasters.push(row.id);

    const lineItem = await payslipLineItemModel.create({
      payslipId,
      componentId: null,
      source: PayslipLineSource.INCENTIVE_MASTER,
      sourceId: row.id,
      amount: '1000000.00',
    } as any);
    createdIds.payslipLineItems.push(lineItem.id);

    await expect(
      incentiveMasterService.update(
        row.id,
        { incentiveAmount: '9999999.00' } as any,
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  // Completes the ke-7 master coverage (audit-trail follow-up, §1C) — the one
  // gap this suite previously had. Unlike the other 6 (checked against
  // payslip_line_items/payroll_runs), leave_policy_master's reference check is
  // against leave_balances.resolved_from_policy_id — a real per-row FK set by
  // LeaveBalancesService.resolveOne(), not a period+category heuristic.
  it('leave-policy-master: rejects editing annualQuota once resolved into a leave_balances row', async () => {
    const leaveType = await leaveTypeModel.create({
      name: `LockTest LeaveType ${randomUUID()}`,
    } as any);
    createdIds.leaveTypes.push(leaveType.id);

    const row = await leavePolicyMasterModel.create({
      leaveTypeId: leaveType.id,
      scopeType: ScopeType.EMPLOYEE,
      scopeValue: employeeId,
      annualQuota: 12,
      effectiveStartDate: TEST_PERIOD_DATE,
      effectiveEndDate: null,
      createdBy: randomUUID(),
    } as any);
    createdIds.leavePolicyMasters.push(row.id);

    const leaveBalance = await leaveBalanceModel.create({
      employeeId,
      leaveTypeId: leaveType.id,
      year: 2029,
      quota: 12,
      used: 0,
      manuallyAdjusted: false,
      resolvedFromPolicyId: row.id,
    } as any);
    createdIds.leaveBalances.push(leaveBalance.id);

    await expect(
      leavePolicyMasterService.update(
        row.id,
        { annualQuota: 24 } as any,
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });
});
