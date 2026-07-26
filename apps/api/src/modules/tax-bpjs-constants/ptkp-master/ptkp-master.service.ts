import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';
import { randomUUID } from 'crypto';
import { PtkpStatus, Role } from '@payroll-system/shared-types';
import {
  resolveEffectiveRecord,
  resolveEffectiveRecords,
} from '../../../common/effective-dating/resolve-effective';
import { EffectiveRangePayslipChecker } from '../../../common/effective-dating/effective-range-payslip-checker';
import { closeOverlappingPredecessor } from '../../../common/effective-dating/close-overlapping-predecessor';
import { assertRetireReasonProvided } from '../../../common/effective-dating/retire-reason';
import { auditOptions } from '../../../common/audit/audit-actor';
import { PtkpMaster } from './entities/ptkp-master.entity';
import { CreatePtkpMasterDto } from './dto/create-ptkp-master.dto';
import { UpdatePtkpMasterDto } from './dto/update-ptkp-master.dto';

@Injectable()
export class PtkpMasterService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(PtkpMaster)
    private readonly ptkpMasterModel: typeof PtkpMaster,
    private readonly effectiveRangePayslipChecker: EffectiveRangePayslipChecker,
  ) {}

  // Admin view: every row, active or not — HR needs to see expired/future rows
  // to manage effective-dating. Do NOT date-filter this one.
  list(): Promise<PtkpMaster[]> {
    return this.ptkpMasterModel.findAll();
  }

  // Payroll-facing: only the rows active for `periodDate` (all 8 statuses).
  resolveEffective(periodDate: string): Promise<PtkpMaster[]> {
    return resolveEffectiveRecords(this.ptkpMasterModel, periodDate);
  }

  // The single PTKP amount for one status, active for `periodDate`.
  async resolveByStatus(
    ptkpStatus: PtkpStatus,
    periodDate: string,
  ): Promise<PtkpMaster> {
    const record = await resolveEffectiveRecord(
      this.ptkpMasterModel,
      periodDate,
      {
        ptkpStatus,
      },
    );
    if (!record) {
      throw new NotFoundException(
        `No PTKP amount for ${ptkpStatus} effective on ${periodDate}`,
      );
    }
    return record;
  }

  async findByIdOrThrow(id: string): Promise<PtkpMaster> {
    const record = await this.ptkpMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`PTKP master ${id} not found`);
    }
    return record;
  }

  // §11 audit follow-up — auto-closes whatever row is still open
  // (effectiveEndDate IS NULL) for this same ptkpStatus the day before this
  // new row starts, so two open-ended rows for the same status can never
  // coexist (the overlap gap EffectiveRangePayslipChecker's audit found).
  // See closeOverlappingPredecessor for when it refuses to guess instead.
  create(
    dto: CreatePtkpMasterDto,
    createdBy: string,
    actorRole: Role,
  ): Promise<PtkpMaster> {
    return this.sequelize.transaction(async (transaction) => {
      const newRowId = randomUUID();
      await closeOverlappingPredecessor(
        this.ptkpMasterModel,
        { ptkpStatus: dto.ptkpStatus },
        dto.effectiveStartDate,
        transaction,
        newRowId,
        createdBy,
        actorRole,
      );
      return this.ptkpMasterModel.create(
        { id: newRowId, ...dto, createdBy } as any,
        { transaction, ...auditOptions({ id: createdBy, role: actorRole }) },
      );
    });
  }

  // §11/P8-T07-style audit fix — computeDecemberPph21 resolves this row by
  // (ptkpStatus, periodDate) for every payslip's annual true-up; its
  // payslip_line_items row has source_id=null (no per-row FK, see
  // EffectiveRangePayslipChecker's doc comment), so the lock is checked by
  // period + ptkpStatus instead of by id.
  async update(
    id: string,
    dto: UpdatePtkpMasterDto,
    updatedBy: string,
    actorRole: Role,
  ): Promise<PtkpMaster> {
    const record = await this.findByIdOrThrow(id);
    await this.assertLockedFieldsUntouched(record, dto);
    assertRetireReasonProvided(record, dto);
    return record.update(
      { ...dto, updatedBy },
      auditOptions({ id: updatedBy, role: actorRole }, dto.reason),
    );
  }

  // effectiveEndDate is deliberately NOT locked (audit follow-up): closing a
  // row's range off doesn't change any historical calculation — it can only
  // ever narrow which future periods this row would still resolve for. A row
  // that's already "referenced" (§11) must stay closeable, or an overlap
  // this codebase is otherwise trying to prevent (see
  // closeOverlappingPredecessor) becomes permanently un-fixable.
  private async assertLockedFieldsUntouched(
    record: PtkpMaster,
    dto: UpdatePtkpMasterDto,
  ): Promise<void> {
    const lockedFields: Array<keyof UpdatePtkpMasterDto> = [
      'ptkpStatus',
      'amount',
      'effectiveStartDate',
    ];
    const touched = lockedFields.find((field) => dto[field] !== undefined);
    if (!touched) {
      return;
    }

    const referenced = await this.effectiveRangePayslipChecker.isReferenced(
      {
        effectiveStartDate: record.effectiveStartDate,
        effectiveEndDate: record.effectiveEndDate,
      },
      (employee) => employee.ptkpStatus === record.ptkpStatus,
    );
    if (referenced) {
      throw new ConflictException(
        `PTKP master ${record.id}'s ${touched} is locked — a payslip already ` +
          `exists for a period this row covers, for an employee with ` +
          `ptkpStatus ${record.ptkpStatus} (§11/P8-T07); retire it via ` +
          `effectiveEndDate and add a new row instead of editing this one`,
      );
    }
  }

  // No remove() — tax/BPJS constant tables are never hard-deleted (§11); retire
  // a superseded figure via effectiveEndDate instead.
}
