import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';
import { randomUUID } from 'crypto';
import { Role } from '@payroll-system/shared-types';
import { resolveEffectiveRecord } from '../../../common/effective-dating/resolve-effective';
import { EffectiveRangePayslipChecker } from '../../../common/effective-dating/effective-range-payslip-checker';
import { closeOverlappingPredecessor } from '../../../common/effective-dating/close-overlapping-predecessor';
import { assertRetireReasonProvided } from '../../../common/effective-dating/retire-reason';
import { auditOptions } from '../../../common/audit/audit-actor';
import { BpjsKesehatanMaster } from './entities/bpjs-kesehatan-master.entity';
import { CreateBpjsKesehatanMasterDto } from './dto/create-bpjs-kesehatan-master.dto';
import { UpdateBpjsKesehatanMasterDto } from './dto/update-bpjs-kesehatan-master.dto';

@Injectable()
export class BpjsKesehatanMasterService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(BpjsKesehatanMaster)
    private readonly bpjsKesehatanMasterModel: typeof BpjsKesehatanMaster,
    private readonly effectiveRangePayslipChecker: EffectiveRangePayslipChecker,
  ) {}

  // Admin view: every row, active or not.
  list(): Promise<BpjsKesehatanMaster[]> {
    // BUGS#19 — id/name only, see salary_master.service.ts's list().
    return this.bpjsKesehatanMasterModel.findAll({
      include: [{ association: 'updatedByUser', attributes: ['id', 'name'] }],
      order: [['updatedAt', 'DESC']],
    });
  }

  // Payroll-facing: the single rate/cap row active for `periodDate`.
  async resolveEffective(periodDate: string): Promise<BpjsKesehatanMaster> {
    const record = await resolveEffectiveRecord(
      this.bpjsKesehatanMasterModel,
      periodDate,
    );
    if (!record) {
      throw new NotFoundException(
        `No BPJS Kesehatan rate configured effective on ${periodDate}`,
      );
    }
    return record;
  }

  async findByIdOrThrow(id: string): Promise<BpjsKesehatanMaster> {
    const record = await this.bpjsKesehatanMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`BPJS Kesehatan master ${id} not found`);
    }
    return record;
  }

  // §11 audit follow-up — auto-closes whatever row is still open
  // (effectiveEndDate IS NULL) the day before this new row starts. No
  // category dimension here (one rate card applies to everyone per period),
  // so the "same category" filter is simply "no filter at all".
  create(
    dto: CreateBpjsKesehatanMasterDto,
    createdBy: string,
    actorRole: Role,
  ): Promise<BpjsKesehatanMaster> {
    return this.sequelize.transaction(async (transaction) => {
      const newRowId = randomUUID();
      await closeOverlappingPredecessor(
        this.bpjsKesehatanMasterModel,
        {},
        dto.effectiveStartDate,
        transaction,
        newRowId,
        createdBy,
        actorRole,
      );
      return this.bpjsKesehatanMasterModel.create(
        { id: newRowId, ...dto, createdBy } as any,
        { transaction, ...auditOptions({ id: createdBy, role: actorRole }) },
      );
    });
  }

  // §11/P8-T07-style audit fix — bpjsEmployeeRates/bpjsCompanyRates resolve
  // this row by periodDate alone (no per-employee category, unlike
  // ptkp_master), so any payslip in a covered period is enough to lock it.
  async update(
    id: string,
    dto: UpdateBpjsKesehatanMasterDto,
    updatedBy: string,
    actorRole: Role,
  ): Promise<BpjsKesehatanMaster> {
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
    record: BpjsKesehatanMaster,
    dto: UpdateBpjsKesehatanMasterDto,
  ): Promise<void> {
    const lockedFields: Array<keyof UpdateBpjsKesehatanMasterDto> = [
      'employeeRate',
      'companyRate',
      'wageCap',
      'effectiveStartDate',
    ];
    const touched = lockedFields.find((field) => dto[field] !== undefined);
    if (!touched) {
      return;
    }

    const referenced = await this.effectiveRangePayslipChecker.isReferenced({
      effectiveStartDate: record.effectiveStartDate,
      effectiveEndDate: record.effectiveEndDate,
    });
    if (referenced) {
      throw new ConflictException(
        `BPJS Kesehatan master ${record.id}'s ${touched} is locked — a ` +
          `payslip already exists for a period this row covers (§11/P8-T07); ` +
          `retire it via effectiveEndDate and add a new row instead of ` +
          `editing this one`,
      );
    }
  }
}
