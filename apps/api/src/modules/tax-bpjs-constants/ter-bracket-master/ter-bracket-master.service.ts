import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';
import { randomUUID } from 'crypto';
import { Role, TerCategory } from '@payroll-system/shared-types';
import { resolveEffectiveRecords } from '../../../common/effective-dating/resolve-effective';
import { EffectiveRangePayslipChecker } from '../../../common/effective-dating/effective-range-payslip-checker';
import { closeOverlappingPredecessor } from '../../../common/effective-dating/close-overlapping-predecessor';
import { assertRetireReasonProvided } from '../../../common/effective-dating/retire-reason';
import { auditOptions } from '../../../common/audit/audit-actor';
import { TerBracketMaster } from './entities/ter-bracket-master.entity';
import { CreateTerBracketMasterDto } from './dto/create-ter-bracket-master.dto';
import { UpdateTerBracketMasterDto } from './dto/update-ter-bracket-master.dto';
import { resolveTerCategory } from './ter-lookup';

@Injectable()
export class TerBracketMasterService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(TerBracketMaster)
    private readonly terBracketMasterModel: typeof TerBracketMaster,
    private readonly effectiveRangePayslipChecker: EffectiveRangePayslipChecker,
  ) {}

  // Admin view: every bracket row, active or not.
  list(): Promise<TerBracketMaster[]> {
    // BUGS#19 — id/name only, see salary_master.service.ts's list().
    return this.terBracketMasterModel.findAll({
      include: [{ association: 'updatedByUser', attributes: ['id', 'name'] }],
      order: [['updatedAt', 'DESC']],
    });
  }

  // Payroll-facing: all brackets active for `periodDate` (optionally one category).
  resolveEffective(
    periodDate: string,
    terCategory?: TerCategory,
  ): Promise<TerBracketMaster[]> {
    return resolveEffectiveRecords(
      this.terBracketMasterModel,
      periodDate,
      terCategory ? { terCategory } : {},
    );
  }

  async findByIdOrThrow(id: string): Promise<TerBracketMaster> {
    const record = await this.terBracketMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`TER bracket master ${id} not found`);
    }
    return record;
  }

  // §11 audit follow-up — unlike ptkp/bpjs-kesehatan/bpjs-ketenagakerjaan
  // (keyed on ptkpStatus, or no filter at all), this table's "same category"
  // for overlap-prevention purposes is the FULL bracket identity —
  // (terCategory, incomeLowerBound, incomeUpperBound) — not terCategory
  // alone. Several DIFFERENT bracket rows legitimately coexist open-ended at
  // once for the SAME terCategory (category A's Rp0–5jt bracket and category
  // A's Rp5jt+ bracket are both "open" simultaneously, by design — they are
  // not alternatives of each other). Keying on terCategory alone would
  // auto-close every unrelated bracket in that category the moment any ONE
  // bracket is superseded, which is why this was held back pending
  // confirmation rather than assumed.
  create(
    dto: CreateTerBracketMasterDto,
    createdBy: string,
    actorRole: Role,
  ): Promise<TerBracketMaster> {
    return this.sequelize.transaction(async (transaction) => {
      const newRowId = randomUUID();
      await closeOverlappingPredecessor(
        this.terBracketMasterModel,
        {
          terCategory: dto.terCategory,
          incomeLowerBound: dto.incomeLowerBound,
          incomeUpperBound: dto.incomeUpperBound ?? null,
        },
        dto.effectiveStartDate,
        transaction,
        newRowId,
        createdBy,
        actorRole,
      );
      return this.terBracketMasterModel.create(
        { id: newRowId, ...dto, createdBy } as any,
        { transaction, ...auditOptions({ id: createdBy, role: actorRole }) },
      );
    });
  }

  // §11/P8-T07-style audit fix — calculateEmployeePayslip's TER lookup
  // resolves brackets by (terCategory, periodDate); an employee's terCategory
  // is derived from their ptkpStatus via resolveTerCategory (ter-lookup.ts),
  // so the lock's category matcher re-derives it the same way rather than
  // duplicating the PTKP→TER mapping.
  async update(
    id: string,
    dto: UpdateTerBracketMasterDto,
    updatedBy: string,
    actorRole: Role,
  ): Promise<TerBracketMaster> {
    const record = await this.findByIdOrThrow(id);
    await this.assertLockedFieldsUntouched(record, dto);
    assertRetireReasonProvided(record, dto);
    return record.update(
      { ...dto, updatedBy },
      auditOptions({ id: updatedBy, role: actorRole }, dto.reason),
    );
  }

  // effectiveEndDate is deliberately NOT locked (audit follow-up): closing a
  // row's range off doesn't change any historical calculation, so a
  // "referenced" row must stay closeable — see closeOverlappingPredecessor.
  private async assertLockedFieldsUntouched(
    record: TerBracketMaster,
    dto: UpdateTerBracketMasterDto,
  ): Promise<void> {
    const lockedFields: Array<keyof UpdateTerBracketMasterDto> = [
      'terCategory',
      'incomeLowerBound',
      'incomeUpperBound',
      'rate',
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
      (employee) => resolveTerCategory(employee.ptkpStatus) === record.terCategory,
    );
    if (referenced) {
      throw new ConflictException(
        `TER bracket master ${record.id}'s ${touched} is locked — a payslip ` +
          `already exists for a period this row covers, for an employee ` +
          `whose PTKP status maps to TER category ${record.terCategory} ` +
          `(§11/P8-T07); retire it via effectiveEndDate and add a new row ` +
          `instead of editing this one`,
      );
    }
  }
}
