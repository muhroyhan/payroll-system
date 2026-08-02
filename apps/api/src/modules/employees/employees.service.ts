import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { PtkpStatus, Role } from '@payroll-system/shared-types';
import { auditOptions } from '../../common/audit/audit-actor';
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

  async create(
    dto: CreateEmployeeDto,
    currentUserId: string,
    actorRole: Role,
  ): Promise<Employee> {
    this.assertBankAccountHolderNameMatches(dto.name, dto.bankAccountHolderName);

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

    // Audit-trail follow-up (§D) — a brand-new employee created with the
    // override already on on is still "activating" it; requires a reason
    // just like the false -> true transition in update() below.
    if (ptkpManuallyOverridden && !dto.ptkpOverrideReason) {
      throw new BadRequestException(
        'Alasan wajib diisi saat mengaktifkan timpa manual status PTKP',
      );
    }

    try {
      const created = await this.employeeModel.create(
        {
          ...dto,
          ptkpStatus,
          ptkpManuallyOverridden,
          ptkpOverriddenBy: ptkpManuallyOverridden ? currentUserId : null,
          ptkpOverriddenAt: ptkpManuallyOverridden ? new Date() : null,
          ptkpOverriddenReason: ptkpManuallyOverridden
            ? dto.ptkpOverrideReason
            : null,
        } as any,
        auditOptions(
          { id: currentUserId, role: actorRole },
          dto.ptkpOverrideReason,
        ),
      );
      return this.findByIdOrThrow(created.id);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
    currentUserId: string,
    actorRole: Role,
  ): Promise<Employee> {
    const record = await this.findByIdOrThrow(id);

    this.assertBankAccountHolderNameMatches(
      dto.name ?? record.name,
      dto.bankAccountHolderName !== undefined
        ? dto.bankAccountHolderName
        : record.bankAccountHolderName,
    );

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

    const patch: Record<string, unknown> = {
      ...dto,
      ptkpStatus,
      ptkpManuallyOverridden: effectiveOverridden,
    };

    // Audit-trail follow-up (§D) — only touch the override-tracking fields
    // at the actual on/off transition: leave them alone (historical) while
    // it stays on across an unrelated field edit, and clear them together
    // if the override is switched back off.
    if (effectiveOverridden && !record.ptkpManuallyOverridden) {
      if (!dto.ptkpOverrideReason) {
        throw new BadRequestException(
          'Alasan wajib diisi saat mengaktifkan timpa manual status PTKP',
        );
      }
      patch.ptkpOverriddenBy = currentUserId;
      patch.ptkpOverriddenAt = new Date();
      patch.ptkpOverriddenReason = dto.ptkpOverrideReason;
    } else if (!effectiveOverridden && record.ptkpManuallyOverridden) {
      patch.ptkpOverriddenBy = null;
      patch.ptkpOverriddenAt = null;
      patch.ptkpOverriddenReason = null;
    }

    try {
      await record.update(
        patch,
        auditOptions(
          { id: currentUserId, role: actorRole },
          dto.ptkpOverrideReason,
        ),
      );
      return this.findByIdOrThrow(id);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  // EMP-013 — a bank account under a different holder's name can't actually
  // be paid into for this employee, so it's rejected outright rather than
  // silently accepted. Case-insensitive/trimmed on purpose: bank statements
  // routinely come back in ALL CAPS, and that's still the same person, not a
  // data error worth blocking on — an exact byte match would reject valid
  // matches far more often than it'd catch real mistakes. Only enforced when
  // a holder name is actually given (the field itself stays optional).
  private assertBankAccountHolderNameMatches(
    employeeName: string,
    bankAccountHolderName: string | null | undefined,
  ): void {
    if (!bankAccountHolderName) {
      return;
    }
    const matches =
      employeeName.trim().toLowerCase() ===
      bankAccountHolderName.trim().toLowerCase();
    if (!matches) {
      // Field-name-prefixed so the frontend's shared 400 parser
      // (api/errors.ts's parseValidationMessages, R-04) routes this onto the
      // bankAccountHolderName Form.Item instead of a general toast — same
      // convention as the DTO's own "nik must be exactly 16 digits"/"npwp
      // must be 15 or 16 digits" messages.
      throw new BadRequestException(
        'bankAccountHolderName Nama Pemilik Rekening Bank berbeda dengan Nama Karyawan',
      );
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
