import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import {
  EmployeeActiveStatus,
  EmploymentStatus,
  Gender,
  KasbonStatus,
  MaritalStatus,
  PayrollRunStatus,
  PtkpStatus,
  ScopeType,
  TerCategory,
} from '@payroll-system/shared-types';
import databaseConfig from '../src/config/database.config';
import { envValidationSchema } from '../src/config/env-validation.schema';
import { PayrollCalculationModule } from '../src/modules/payroll-calculation/payroll-calculation.module';
import { PayrollRunCalculationService } from '../src/modules/payroll-calculation/payroll-run-calculation.service';
import { calculateProration } from '../src/modules/payroll-calculation/prorate.core';
import { PayrollCalculationProcessor } from '../src/jobs/payroll-calculation.processor';
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
import { TerBracketMaster } from '../src/modules/tax-bpjs-constants/ter-bracket-master/entities/ter-bracket-master.entity';
import { BpjsKesehatanMaster } from '../src/modules/tax-bpjs-constants/bpjs-kesehatan-master/entities/bpjs-kesehatan-master.entity';
import { BpjsKetenagakerjaanMaster } from '../src/modules/tax-bpjs-constants/bpjs-ketenagakerjaan-master/entities/bpjs-ketenagakerjaan-master.entity';
import { SalaryMaster } from '../src/modules/salary-master/entities/salary-master.entity';
import { Kasbon } from '../src/modules/kasbon/entities/kasbon.entity';
import { KasbonDeduction } from '../src/modules/kasbon/entities/kasbon-deduction.entity';
import { Holiday } from '../src/modules/holidays/entities/holiday.entity';

// Deliberately NOT AppModule — same reason as effective-range-lock.e2e-spec.ts
// (AppModule drags in puppeteer via pdf-generation, which breaks ts-jest).
// PayrollCalculationModule already wires everything PayrollRunCalculationService
// and PayrollCalculationProcessor need EXCEPT PayrollRun/PayslipComponent
// themselves (PayrollCalculationModule never registers PayrollRun — the
// service only ever receives one as a plain argument — and PayslipLineItem's
// @BelongsTo(() => PayslipComponent) needs that class registered in this
// Sequelize instance or association wiring throws at boot, same gotcha noted
// in effective-range-lock.e2e-spec.ts).
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
    SequelizeModule.forFeature([PayrollRun, PayslipComponent]),
    PayrollCalculationModule,
  ],
})
class ProrateExclusionTestModule {}

// Real-DB integration coverage for Task A (prorate join/resign mid-period)
// and Task B (reject negative take-home without failing the whole run),
// exercised together in ONE payroll run — exactly the scenario described in
// the task brief. Runs the real PayrollCalculationProcessor (with only
// PdfGenerationQueue mocked — no BullMQ/Redis needed for this) against real
// employees/masters, so it also re-verifies the processor's employee
// date-range filter (Task A §3, the "all-or-nothing by status flag" fix) end
// to end, not just the pure prorate.core.ts math.
describe('Prorate + negative-net-pay exclusion (Task A & B, integration)', () => {
  const PERIOD = '2029-04';
  const PERIOD_START = '2029-04-01';
  const PERIOD_END_EXCLUSIVE = '2029-05-01';

  const createdIds = {
    kasbon: [] as string[],
    payrollRuns: [] as string[],
    salaryMasters: [] as string[],
    terBracketMasters: [] as string[],
    bpjsKesehatanMasters: [] as string[],
    bpjsKetenagakerjaanMasters: [] as string[],
    employees: [] as string[],
    employeeTypeId: '',
    positionId: '',
    departmentId: '',
    divisionId: '',
  };

  let moduleRef: TestingModule;
  let calculationService: PayrollRunCalculationService;
  let payrollRunModel: typeof PayrollRun;
  let employeeModel: typeof Employee;
  let employeeTypeModel: typeof EmployeeType;
  let positionModel: typeof Position;
  let departmentModel: typeof Department;
  let divisionModel: typeof Division;
  let payslipModel: typeof Payslip;
  let payslipLineItemModel: typeof PayslipLineItem;
  let excludedEmployeeModel: typeof PayrollRunExcludedEmployee;
  let terBracketMasterModel: typeof TerBracketMaster;
  let bpjsKesehatanMasterModel: typeof BpjsKesehatanMaster;
  let bpjsKetenagakerjaanMasterModel: typeof BpjsKetenagakerjaanMaster;
  let salaryMasterModel: typeof SalaryMaster;
  let kasbonModel: typeof Kasbon;
  let kasbonDeductionModel: typeof KasbonDeduction;
  let holidayModel: typeof Holiday;

  let runId: string;
  let empFullMonthId: string;
  let empNegativeNetId: string;
  let empJoinedMidMonthId: string;
  let empResignedMidMonthId: string;
  let empNotYetJoinedId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ProrateExclusionTestModule],
    }).compile();

    calculationService = moduleRef.get(PayrollRunCalculationService);
    payrollRunModel = moduleRef.get(getModelToken(PayrollRun));
    employeeModel = moduleRef.get(getModelToken(Employee));
    employeeTypeModel = moduleRef.get(getModelToken(EmployeeType));
    positionModel = moduleRef.get(getModelToken(Position));
    departmentModel = moduleRef.get(getModelToken(Department));
    divisionModel = moduleRef.get(getModelToken(Division));
    payslipModel = moduleRef.get(getModelToken(Payslip));
    payslipLineItemModel = moduleRef.get(getModelToken(PayslipLineItem));
    excludedEmployeeModel = moduleRef.get(getModelToken(PayrollRunExcludedEmployee));
    terBracketMasterModel = moduleRef.get(getModelToken(TerBracketMaster));
    bpjsKesehatanMasterModel = moduleRef.get(getModelToken(BpjsKesehatanMaster));
    bpjsKetenagakerjaanMasterModel = moduleRef.get(
      getModelToken(BpjsKetenagakerjaanMaster),
    );
    salaryMasterModel = moduleRef.get(getModelToken(SalaryMaster));
    kasbonModel = moduleRef.get(getModelToken(Kasbon));
    kasbonDeductionModel = moduleRef.get(getModelToken(KasbonDeduction));
    holidayModel = moduleRef.get(getModelToken(Holiday));

    // --- Org scaffolding ---
    const employeeType = await employeeTypeModel.create({
      name: `ProrateTest EmployeeType ${randomUUID()}`,
    } as any);
    const position = await positionModel.create({
      name: `ProrateTest Position ${randomUUID()}`,
    } as any);
    const department = await departmentModel.create({
      name: `ProrateTest Department ${randomUUID()}`,
    } as any);
    const division = await divisionModel.create({
      name: `ProrateTest Division ${randomUUID()}`,
    } as any);
    createdIds.employeeTypeId = employeeType.id;
    createdIds.positionId = position.id;
    createdIds.departmentId = department.id;
    createdIds.divisionId = division.id;

    // --- Tax/BPJS masters, wide enough to cover every salary used below ---
    const terBracket = await terBracketMasterModel.create({
      terCategory: TerCategory.A,
      incomeLowerBound: '0.00',
      incomeUpperBound: null,
      rate: '0.05000',
      effectiveStartDate: PERIOD_START,
      effectiveEndDate: null,
      createdBy: randomUUID(),
    } as any);
    createdIds.terBracketMasters.push(terBracket.id);

    const bpjsKesehatan = await bpjsKesehatanMasterModel.create({
      employeeRate: '0.01000',
      companyRate: '0.04000',
      wageCap: '12000000.00',
      effectiveStartDate: PERIOD_START,
      effectiveEndDate: null,
      createdBy: randomUUID(),
    } as any);
    createdIds.bpjsKesehatanMasters.push(bpjsKesehatan.id);

    const bpjsKetenagakerjaan = await bpjsKetenagakerjaanMasterModel.create({
      jhtEmployeeRate: '0.02000',
      jhtCompanyRate: '0.03700',
      jpEmployeeRate: '0.01000',
      jpCompanyRate: '0.02000',
      jpWageCap: '11086300.00',
      jkkCompanyRate: '0.00240',
      jkmCompanyRate: '0.00300',
      effectiveStartDate: PERIOD_START,
      effectiveEndDate: null,
      createdBy: randomUUID(),
    } as any);
    createdIds.bpjsKetenagakerjaanMasters.push(bpjsKetenagakerjaan.id);

    // --- Employees ---
    const baseEmployee = {
      npwp: null,
      ptkpStatus: PtkpStatus.TK_0, // → TER category A, matches the bracket above
      maritalStatus: MaritalStatus.SINGLE,
      gender: Gender.MALE,
      dependentCount: 0,
      ptkpManuallyOverridden: true,
      employmentStatus: EmploymentStatus.TETAP,
      employeeTypeId: employeeType.id,
      positionId: position.id,
      departmentId: department.id,
      divisionId: division.id,
    };
    const nik = () => `9${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 16).padEnd(16, '0');

    const empFullMonth = await employeeModel.create({
      ...baseEmployee,
      name: 'ProrateTest Full Month',
      nik: nik(),
      startDate: '2020-01-01',
      endDate: null,
      status: EmployeeActiveStatus.ACTIVE,
    } as any);
    empFullMonthId = empFullMonth.id;
    createdIds.employees.push(empFullMonthId);

    const empNegativeNet = await employeeModel.create({
      ...baseEmployee,
      name: 'ProrateTest Negative Net',
      nik: nik(),
      startDate: '2020-01-01',
      endDate: null,
      status: EmployeeActiveStatus.ACTIVE,
    } as any);
    empNegativeNetId = empNegativeNet.id;
    createdIds.employees.push(empNegativeNetId);

    const empJoinedMidMonth = await employeeModel.create({
      ...baseEmployee,
      name: 'ProrateTest Joined Mid-Month',
      nik: nik(),
      startDate: '2029-04-16',
      endDate: null,
      status: EmployeeActiveStatus.ACTIVE,
    } as any);
    empJoinedMidMonthId = empJoinedMidMonth.id;
    createdIds.employees.push(empJoinedMidMonthId);

    // Resigned mid-period AND marked inactive — the exact "all-or-nothing by
    // status flag" gap: the OLD filter (`status = active`) would have made
    // this employee vanish from the run entirely instead of getting a final
    // prorated payslip.
    const empResignedMidMonth = await employeeModel.create({
      ...baseEmployee,
      name: 'ProrateTest Resigned Mid-Month',
      nik: nik(),
      startDate: '2020-01-01',
      endDate: '2029-04-10',
      status: EmployeeActiveStatus.INACTIVE,
    } as any);
    empResignedMidMonthId = empResignedMidMonth.id;
    createdIds.employees.push(empResignedMidMonthId);

    // Negative control — hasn't joined yet as of this period; must be
    // excluded from the run's employee count entirely (no payslip, no
    // exclusion record — never evaluated at all).
    const empNotYetJoined = await employeeModel.create({
      ...baseEmployee,
      name: 'ProrateTest Not Yet Joined',
      nik: nik(),
      startDate: '2029-05-01',
      endDate: null,
      status: EmployeeActiveStatus.ACTIVE,
    } as any);
    empNotYetJoinedId = empNotYetJoined.id;
    createdIds.employees.push(empNotYetJoinedId);

    // --- Salary masters (EMPLOYEE scope) ---
    const salaries: Array<[string, string]> = [
      [empFullMonthId, '8000000.00'],
      [empNegativeNetId, '3000000.00'],
      [empJoinedMidMonthId, '10000000.00'],
      [empResignedMidMonthId, '6000000.00'],
    ];
    for (const [employeeId, baseSalary] of salaries) {
      const row = await salaryMasterModel.create({
        scopeType: ScopeType.EMPLOYEE,
        scopeValue: employeeId,
        baseSalary,
        effectiveStartDate: '2020-01-01',
        effectiveEndDate: null,
        createdBy: randomUUID(),
      } as any);
      createdIds.salaryMasters.push(row.id);
    }

    // --- Kasbon for the negative-net employee: installment (6,000,000) far
    // exceeds what's left of gross (3,000,000) after tax/BPJS, engineering a
    // negative net pay deterministically regardless of rounding. Created
    // directly at APPROVED with remainingBalance set (bypassing the
    // request→approve workflow, which isn't the thing under test here).
    const kasbon = await kasbonModel.create({
      employeeId: empNegativeNetId,
      amount: '6000000.00',
      requestDate: '2029-04-01',
      installmentCount: 1,
      installmentAmount: '6000000.00',
      remainingBalance: '6000000.00',
      status: KasbonStatus.APPROVED,
      approvedBy: randomUUID(),
    } as any);
    createdIds.kasbon.push(kasbon.id);

    // --- The payroll run itself, started as draft (mirrors the real
    // lifecycle: requestCalculation only ever enqueues a draft run). ---
    const run = await payrollRunModel.create({
      period: PERIOD,
      status: PayrollRunStatus.DRAFT,
      createdBy: randomUUID(),
    } as any);
    runId = run.id;
    createdIds.payrollRuns.push(runId);
  }, 30000);

  afterAll(async () => {
    // Deliberately NOT accumulated-id-based (an earlier version of this test
    // pushed ids into createdIds.* only on the SUCCESS path of each `it()` —
    // when an assertion threw before the push, cleanup silently skipped that
    // row, leaving FK-referenced orphans that broke payroll_runs.destroy()
    // below on the next run). Querying directly by the run/employee ids
    // captured in beforeAll is correct regardless of which assertions
    // passed or failed. Child → parent, mirroring PayrollRunRevertService's
    // ordering.
    const payslips = await payslipModel.findAll({
      where: { payrollRunId: runId },
      attributes: ['id'],
    });
    const payslipIds = payslips.map((p) => p.id);
    await payslipLineItemModel.destroy({
      where: { payslipId: payslipIds },
      force: true,
    });
    await payslipModel.destroy({
      where: { id: payslipIds },
      force: true,
    });
    await excludedEmployeeModel.destroy({
      where: { payrollRunId: runId },
      force: true,
    });
    await kasbonDeductionModel.destroy({
      where: { kasbonId: createdIds.kasbon },
      force: true,
    });
    await kasbonModel.destroy({ where: { id: createdIds.kasbon }, force: true });
    await payrollRunModel.destroy({
      where: { id: createdIds.payrollRuns },
      force: true,
    });
    await salaryMasterModel.destroy({
      where: { id: createdIds.salaryMasters },
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

  it('runs the full processor once: 4 eligible employees, 1 excluded, run reaches calculated', async () => {
    const payrollRunModelToken = payrollRunModel;
    const employeeModelToken = employeeModel;
    const payslipModelToken = payslipModel;
    const pdfGenerationQueue = {
      enqueuePayslipPdfBulk: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new PayrollCalculationProcessor(
      payrollRunModelToken,
      employeeModelToken,
      payslipModelToken,
      calculationService,
      pdfGenerationQueue as any,
    );

    await processor.process({
      name: 'calculate-payroll-run',
      data: { payrollRunId: runId },
    } as any);

    const run = await payrollRunModel.findByPk(runId);
    expect(run!.status).toBe(PayrollRunStatus.CALCULATED);
    // 4 eligible (full-month, negative-net, joined-mid-month, resigned-mid-
    // month) — empNotYetJoined's employment window doesn't touch this period
    // at all, so the date-range filter excludes it from the count entirely
    // (Task A §3 fix).
    expect(run!.totalCount).toBe(4);
    expect(run!.processedCount).toBe(4);

    // Task B — exactly one exclusion, with a human-readable reason, and the
    // run still reached `calculated` despite it (partial failure, not a
    // whole-run failure).
    const exclusions = await excludedEmployeeModel.findAll({
      where: { payrollRunId: runId },
    });
    expect(exclusions).toHaveLength(1);
    expect(exclusions[0].employeeId).toBe(empNegativeNetId);
    expect(exclusions[0].reason).toContain('Take-home negatif');
    expect(Number(exclusions[0].netPay)).toBeLessThan(0);
    expect(Number(exclusions[0].grossPay)).toBe(3_000_000);

    // No payslip was ever created for the excluded employee.
    const negativeNetPayslip = await payslipModel.findOne({
      where: { payrollRunId: runId, employeeId: empNegativeNetId },
    });
    expect(negativeNetPayslip).toBeNull();

    // The kasbon deduction that was drawn during the (rolled-back)
    // transaction must NOT be left dangling — the whole point of throwing
    // inside the transaction is that it's undone.
    const remainingKasbon = await kasbonModel.findByPk(
      createdIds.kasbon[0],
    );
    expect(Number(remainingKasbon!.remainingBalance)).toBe(6_000_000);
    const kasbonDeductions = await kasbonDeductionModel.findAll({
      where: { kasbonId: createdIds.kasbon[0] },
    });
    expect(kasbonDeductions).toHaveLength(0);

    expect(pdfGenerationQueue.enqueuePayslipPdfBulk).toHaveBeenCalledTimes(1);
    const enqueuedIds: string[] = pdfGenerationQueue.enqueuePayslipPdfBulk.mock.calls[0][0];
    expect(enqueuedIds).toHaveLength(3);
  }, 30000);

  it('full-month employee: not prorated, taxableGross equals the full salary', async () => {
    const payslip = await payslipModel.findOne({
      where: { payrollRunId: runId, employeeId: empFullMonthId },
    });

    expect(Number(payslip!.workedDays)).toBe(payslip!.totalWorkingDays);
    expect(Number(payslip!.grossPay)).toBe(8_000_000);
    expect(Number(payslip!.taxableGross)).toBe(8_000_000);
    expect(Number(payslip!.netPay)).toBeGreaterThan(0);
  });

  it('joined mid-month: prorated down, taxableGross scaled by the same factor prorate.core.ts computes', async () => {
    const payslip = await payslipModel.findOne({
      where: { payrollRunId: runId, employeeId: empJoinedMidMonthId },
    });

    const holidays = await holidayModel.findAll({
      where: { isActive: true },
    });
    const expected = calculateProration(
      PERIOD_START,
      PERIOD_END_EXCLUSIVE,
      '2029-04-16',
      null,
      holidays.map((h) => h.date),
    );

    expect(payslip!.totalWorkingDays).toBe(expected.workingDaysInMonth);
    expect(Number(payslip!.workedDays)).toBe(expected.workedWorkingDays);
    expect(Number(payslip!.workedDays)).toBeLessThan(payslip!.totalWorkingDays!);
    // Task A §2 — prorate affects taxableGross itself (feeds PPh21), not just
    // a display-only net-pay adjustment.
    const expectedTaxableGross = Math.round(10_000_000 * expected.factor);
    expect(Number(payslip!.taxableGross)).toBe(expectedTaxableGross);
    expect(Number(payslip!.taxableGross)).toBeLessThan(10_000_000);
  });

  it('resigned mid-month: still processed (not dropped from the run) and prorated', async () => {
    const payslip = await payslipModel.findOne({
      where: { payrollRunId: runId, employeeId: empResignedMidMonthId },
    });
    expect(payslip).not.toBeNull(); // Task A §3 — the "vanishes entirely" gap

    const holidays = await holidayModel.findAll({
      where: { isActive: true },
    });
    const expected = calculateProration(
      PERIOD_START,
      PERIOD_END_EXCLUSIVE,
      '2020-01-01',
      '2029-04-10',
      holidays.map((h) => h.date),
    );

    expect(Number(payslip!.workedDays)).toBe(expected.workedWorkingDays);
    expect(Number(payslip!.workedDays)).toBeLessThan(payslip!.totalWorkingDays!);
    const expectedTaxableGross = Math.round(6_000_000 * expected.factor);
    expect(Number(payslip!.taxableGross)).toBe(expectedTaxableGross);
  });

  it('the not-yet-joined employee was never evaluated at all', async () => {
    const payslip = await payslipModel.findOne({
      where: { payrollRunId: runId, employeeId: empNotYetJoinedId },
    });
    expect(payslip).toBeNull();
    const exclusion = await excludedEmployeeModel.findOne({
      where: { payrollRunId: runId, employeeId: empNotYetJoinedId },
    });
    expect(exclusion).toBeNull();
  });
});
