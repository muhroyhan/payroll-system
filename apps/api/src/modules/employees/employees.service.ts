import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { PtkpStatus } from '@payroll-system/shared-types';
import { PtkpDerivationService } from '../ptkp/ptkp-derivation.service';
import { ScopeContext } from '../scope-resolver/scope-resolver.types';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const EMPLOYEE_ASSOCIATIONS = [
  'employeeType',
  'position',
  'department',
  'division',
];

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,
    private readonly ptkpDerivationService: PtkpDerivationService,
  ) {}

  list(): Promise<Employee[]> {
    return this.employeeModel.findAll({ include: EMPLOYEE_ASSOCIATIONS });
  }

  async findByIdOrThrow(id: string): Promise<Employee> {
    const record = await this.employeeModel.findByPk(id, {
      include: EMPLOYEE_ASSOCIATIONS,
    });
    if (!record) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    return record;
  }

  // §5.2 — the scope coordinates the resolver matches scope masters against.
  async getScopeContext(employeeId: string): Promise<ScopeContext> {
    const e = await this.findByIdOrThrow(employeeId);
    return {
      employeeId: e.id,
      divisionId: e.divisionId,
      departmentId: e.departmentId,
      positionId: e.positionId,
      employeeTypeId: e.employeeTypeId,
    };
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const ptkpManuallyOverridden = dto.ptkpManuallyOverridden ?? false;
    // §5.1a — DTO validation guarantees ptkpStatus is present when overridden;
    // otherwise propose it from the raw inputs instead of trusting the client.
    const ptkpStatus = ptkpManuallyOverridden
      ? (dto.ptkpStatus as PtkpStatus)
      : this.ptkpDerivationService.derive({
          maritalStatus: dto.maritalStatus,
          dependentCount: dto.dependentCount,
          gender: dto.gender,
          spouseNoIncomeCertificate: dto.spouseNoIncomeCertificate ?? false,
        });

    try {
      const created = await this.employeeModel.create({
        ...dto,
        ptkpStatus,
        ptkpManuallyOverridden,
      } as any);
      return this.findByIdOrThrow(created.id);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const record = await this.findByIdOrThrow(id);

    const effectiveOverridden =
      dto.ptkpManuallyOverridden ?? record.ptkpManuallyOverridden;
    // Once overridden, raw-input edits (marital status, dependent count) must
    // never silently recompute ptkp_status — only an explicit ptkpStatus wins.
    const ptkpStatus = effectiveOverridden
      ? (dto.ptkpStatus ?? record.ptkpStatus)
      : this.ptkpDerivationService.derive({
          maritalStatus: dto.maritalStatus ?? record.maritalStatus,
          dependentCount: dto.dependentCount ?? record.dependentCount,
          gender: dto.gender ?? record.gender,
          spouseNoIncomeCertificate:
            dto.spouseNoIncomeCertificate ?? record.spouseNoIncomeCertificate,
        });

    try {
      await record.update({
        ...dto,
        ptkpStatus,
        ptkpManuallyOverridden: effectiveOverridden,
      });
      return this.findByIdOrThrow(id);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  private translateUniqueConstraintError(error: unknown): unknown {
    if (error instanceof UniqueConstraintError) {
      const field = Object.keys(error.fields ?? {})[0] ?? 'field';
      return new ConflictException(
        `An employee with this ${field} already exists`,
      );
    }
    return error;
  }
}
