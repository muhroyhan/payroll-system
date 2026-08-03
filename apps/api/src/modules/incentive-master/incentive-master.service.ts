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
import { IncentiveMaster } from './entities/incentive-master.entity';
import { CreateIncentiveMasterDto } from './dto/create-incentive-master.dto';
import { UpdateIncentiveMasterDto } from './dto/update-incentive-master.dto';

@Injectable()
export class IncentiveMasterService {
  constructor(
    @InjectModel(IncentiveMaster)
    private readonly incentiveMasterModel: typeof IncentiveMaster,
    private readonly scopeResolver: ScopeResolverService,
    private readonly scopeValueValidator: ScopeValueValidator,
    private readonly employeesService: EmployeesService,
    @Inject(PAYSLIP_REFERENCE_CHECKER)
    private readonly payslipReferenceChecker: PayslipReferenceChecker,
  ) {}

  list(): Promise<IncentiveMaster[]> {
    // BUGS#19 — id/name only, see salary_master.service.ts's list().
    return this.incentiveMasterModel.findAll({
      include: [{ association: 'updatedByUser', attributes: ['id', 'name'] }],
      order: [['updatedAt', 'DESC']],
    });
  }

  async findByIdOrThrow(id: string): Promise<IncentiveMaster> {
    const record = await this.incentiveMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Incentive master ${id} not found`);
    }
    return record;
  }

  async create(
    dto: CreateIncentiveMasterDto,
    createdBy: string,
    actorRole: Role,
  ): Promise<IncentiveMaster> {
    await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    return this.incentiveMasterModel.create(
      { ...dto, createdBy } as any,
      auditOptions({ id: createdBy, role: actorRole }),
    );
  }

  // §11/P8-T07-style audit fix — mirrors SalaryMasterService.update(): once
  // resolveEarnings() has pulled this row into a payslip_line_item
  // (source='incentive_master'), the fields the resolver's answer depends on
  // must stay put. isBpjsEligible is locked here too (not just amount/scope/
  // dates) — same reasoning as PayslipComponentsService's isTaxable/
  // isBpjsEligible lock: flipping it retroactively would make an
  // already-issued payslip's BPJS math disagree with how it was actually
  // computed.
  async update(
    id: string,
    dto: UpdateIncentiveMasterDto,
    updatedBy: string,
    actorRole: Role,
  ): Promise<IncentiveMaster> {
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
    record: IncentiveMaster,
    dto: UpdateIncentiveMasterDto,
  ): Promise<void> {
    const lockedFields: Array<keyof UpdateIncentiveMasterDto> = [
      'scopeType',
      'scopeValue',
      'incentiveAmount',
      'isBpjsEligible',
      'effectiveStartDate',
      'effectiveEndDate',
    ];
    const touched = lockedFields.find((field) => dto[field] !== undefined);
    if (!touched) {
      return;
    }

    const referenced = await this.payslipReferenceChecker.isReferencedByPayslip(
      'incentive_master',
      record.id,
    );
    if (referenced) {
      throw new ConflictException(
        `Incentive master ${record.id}'s ${touched} is locked — it has ` +
          `already been resolved into a payslip line item (§11/P8-T07); a ` +
          `correction is a new row (with its own effective-date range), not ` +
          `an edit to this one`,
      );
    }
  }

  // §5.2 — resolve the incentive that applies to one employee for a period.
  async resolveForEmployee(
    employeeId: string,
    periodDate: string,
  ): Promise<ScopeResolution<IncentiveMaster>> {
    const context = await this.employeesService.getScopeContext(employeeId);
    return this.scopeResolver.resolve(
      this.incentiveMasterModel,
      context,
      periodDate,
    );
  }
}
