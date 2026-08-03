import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EmployeesService } from '../employees/employees.service';
import { ScopeResolverService } from '../scope-resolver/scope-resolver.service';
import { ScopeValueValidator } from '../scope-resolver/scope-value-validator.service';
import { PayslipTempComponent } from './entities/payslip-temp-component.entity';
import { CreatePayslipTempComponentDto } from './dto/create-payslip-temp-component.dto';
import { UpdatePayslipTempComponentDto } from './dto/update-payslip-temp-component.dto';

// Translates this table's actual schema (periodYear/periodMonth, §5.2) into
// the effective-date range ScopeResolverService already understands — the
// component applies only during that one calendar month. Not a second
// resolution mechanism, just this table's period expressed in the shape the
// shared resolver needs.
function periodToEffectiveRange(
  year: number,
  month: number,
): { effectiveStartDate: string; effectiveEndDate: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    effectiveStartDate: `${year}-${pad(month)}-01`,
    effectiveEndDate: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

@Injectable()
export class PayslipTempComponentsService {
  constructor(
    @InjectModel(PayslipTempComponent)
    private readonly tempComponentModel: typeof PayslipTempComponent,
    private readonly scopeResolver: ScopeResolverService,
    private readonly scopeValueValidator: ScopeValueValidator,
    private readonly employeesService: EmployeesService,
  ) {}

  list(): Promise<PayslipTempComponent[]> {
    // BUGS#3 — newest-updated first, the default for every listing.
    return this.tempComponentModel.findAll({
      include: ['component'],
      order: [['updatedAt', 'DESC']],
    });
  }

  async findByIdOrThrow(id: string): Promise<PayslipTempComponent> {
    const record = await this.tempComponentModel.findByPk(id, {
      include: ['component'],
    });
    if (!record) {
      throw new NotFoundException(`Payslip temp component ${id} not found`);
    }
    return record;
  }

  async create(
    dto: CreatePayslipTempComponentDto,
    createdBy: string,
  ): Promise<PayslipTempComponent> {
    await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    const range = periodToEffectiveRange(dto.periodYear, dto.periodMonth);
    return this.tempComponentModel.create({
      ...dto,
      ...range,
      createdBy,
    } as any);
  }

  async update(
    id: string,
    dto: UpdatePayslipTempComponentDto,
  ): Promise<PayslipTempComponent> {
    const record = await this.findByIdOrThrow(id);
    if (dto.scopeType && dto.scopeValue) {
      await this.scopeValueValidator.validate(dto.scopeType, dto.scopeValue);
    }
    const patch: Record<string, unknown> = { ...dto };
    if (dto.periodYear !== undefined || dto.periodMonth !== undefined) {
      const year = dto.periodYear ?? record.periodYear;
      const month = dto.periodMonth ?? record.periodMonth;
      Object.assign(patch, periodToEffectiveRange(year, month));
    }
    return record.update(patch);
  }

  async remove(id: string): Promise<void> {
    const record = await this.findByIdOrThrow(id);
    await record.destroy();
  }

  // §5.2 — every distinct component_id that has a row scoped/effective for
  // this employee/period, each resolved via the SAME ScopeResolverService
  // (per-component_id narrowing, same pattern leave_policy_master already
  // uses via `extraWhere`). Unlike salary/incentive, more than one can apply
  // simultaneously — payroll (Phase 8) sums them, it doesn't pick a winner
  // across components, only within one component_id's competing scope rows.
  async listActiveForEmployee(
    employeeId: string,
    periodDate: string,
  ): Promise<PayslipTempComponent[]> {
    const context = await this.employeesService.getScopeContext(employeeId);
    const candidates = await this.tempComponentModel.findAll({
      attributes: ['componentId'],
      group: ['componentId'],
    });

    const resolvedIds: string[] = [];
    for (const { componentId } of candidates) {
      const resolution = await this.scopeResolver.resolve(
        this.tempComponentModel,
        context,
        periodDate,
        { componentId },
      );
      if (resolution.resolved) {
        resolvedIds.push(resolution.record.id);
      }
    }
    if (resolvedIds.length === 0) {
      return [];
    }

    // Reload the resolved rows WITH the `component` master eager-loaded. The
    // shared scope resolver's findAll (resolveEffectiveRecords) returns bare
    // rows with no associations, but the payroll run (§9) reads
    // component.componentType/isTaxable/isBpjsEligible live off this
    // association (§3 — never duplicated onto the temp row). Without this
    // include, `temp.component` is undefined and the run throws for any
    // employee that has an active temp component. (Regression: found by the
    // P10-T02 smoke test — the first live run with a temp component.)
    return this.tempComponentModel.findAll({
      where: { id: resolvedIds },
      include: ['component'],
    });
  }
}
