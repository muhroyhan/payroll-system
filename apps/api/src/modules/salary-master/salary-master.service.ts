import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Role } from '@payroll-system/shared-types';
import { auditOptions } from '../../common/audit/audit-actor';
import { EmployeesService } from '../employees/employees.service';
import { ScopeResolverService } from '../scope-resolver/scope-resolver.service';
import { ScopeValueValidator } from '../scope-resolver/scope-value-validator.service';
import { ScopeResolution } from '../scope-resolver/scope-resolver.types';
import { PAYSLIP_REFERENCE_CHECKER } from '../../common/payslip-reference/payslip-reference-checker.interface';
import type { PayslipReferenceChecker } from '../../common/payslip-reference/payslip-reference-checker.interface';
import { assertRetireReasonProvided } from '../../common/effective-dating/retire-reason';
import { SalaryMaster } from './entities/salary-master.entity';
import { CreateSalaryMasterDto } from './dto/create-salary-master.dto';
import { UpdateSalaryMasterDto } from './dto/update-salary-master.dto';

@Injectable()
export class SalaryMasterService {
  constructor(
    @InjectModel(SalaryMaster)
    private readonly salaryMasterModel: typeof SalaryMaster,
    private readonly scopeResolver: ScopeResolverService,
    private readonly scopeValueValidator: ScopeValueValidator,
    private readonly employeesService: EmployeesService,
    @Inject(PAYSLIP_REFERENCE_CHECKER)
    private readonly payslipReferenceChecker: PayslipReferenceChecker,
  ) {}

  list(): Promise<SalaryMaster[]> {
    return this.salaryMasterModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<SalaryMaster> {
    const record = await this.salaryMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Salary master ${id} not found`);
    }
    return record;
  }

  async create(
    dto: CreateSalaryMasterDto,
    createdBy: string,
    actorRole: Role,
  ): Promise<SalaryMaster> {
    await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    return this.salaryMasterModel.create(
      { ...dto, createdBy } as any,
      auditOptions({ id: createdBy, role: actorRole }),
    );
  }

  // §11/P8-T07-style audit fix — once PayrollRunCalculationService.
  // resolveEarnings() has pulled this row into a payslip_line_item
  // (source='salary_master', source_id=this row's id), the fields that
  // determine what the resolver returns must stay put: mutating baseSalary,
  // scopeType/scopeValue, or the effective-date range in place would silently
  // change what "the resolver would have returned at that run's period"
  // means, breaking §11's reproducibility guarantee for every already-issued
  // payslip that cites it. Same lock question as PayslipComponentsService.
  // assertMutableFieldsUntouched — reused via the same PayslipReferenceChecker
  // (source='salary_master' is real here: it's exactly the string
  // resolveEarnings() writes, not a placeholder).
  async update(
    id: string,
    dto: UpdateSalaryMasterDto,
    updatedBy: string,
    actorRole: Role,
  ): Promise<SalaryMaster> {
    const record = await this.findByIdOrThrow(id);
    if (dto.scopeType && dto.scopeValue) {
      await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    }
    await this.assertLockedFieldsUntouched(record, dto);
    assertRetireReasonProvided(record, dto);
    return record.update(
      { ...dto, updatedBy },
      auditOptions({ id: updatedBy, role: actorRole }, dto.reason),
    );
  }

  private async assertLockedFieldsUntouched(
    record: SalaryMaster,
    dto: UpdateSalaryMasterDto,
  ): Promise<void> {
    const lockedFields: Array<keyof UpdateSalaryMasterDto> = [
      'scopeType',
      'scopeValue',
      'baseSalary',
      'effectiveStartDate',
      'effectiveEndDate',
    ];
    const touched = lockedFields.find((field) => dto[field] !== undefined);
    if (!touched) {
      return;
    }

    const referenced = await this.payslipReferenceChecker.isReferencedByPayslip(
      'salary_master',
      record.id,
    );
    if (referenced) {
      throw new ConflictException(
        `Salary master ${record.id}'s ${touched} is locked — it has already ` +
          `been resolved into a payslip line item (§11/P8-T07); a correction ` +
          `is a new row (with its own effective-date range), not an edit to ` +
          `this one`,
      );
    }
  }

  // §5.2 — resolve the base salary that applies to one employee for a period.
  async resolveForEmployee(
    employeeId: string,
    periodDate: string,
  ): Promise<ScopeResolution<SalaryMaster>> {
    const context = await this.employeesService.getScopeContext(employeeId);
    return this.scopeResolver.resolve(
      this.salaryMasterModel,
      context,
      periodDate,
    );
  }
}
