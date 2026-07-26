import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';
import { resolveEffectiveRecord } from '../../../common/effective-dating/resolve-effective';
import { EffectiveRangePayslipChecker } from '../../../common/effective-dating/effective-range-payslip-checker';
import { closeOverlappingPredecessor } from '../../../common/effective-dating/close-overlapping-predecessor';
import { BpjsKetenagakerjaanMaster } from './entities/bpjs-ketenagakerjaan-master.entity';
import { CreateBpjsKetenagakerjaanMasterDto } from './dto/create-bpjs-ketenagakerjaan-master.dto';
import { UpdateBpjsKetenagakerjaanMasterDto } from './dto/update-bpjs-ketenagakerjaan-master.dto';

@Injectable()
export class BpjsKetenagakerjaanMasterService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(BpjsKetenagakerjaanMaster)
    private readonly bpjsKetenagakerjaanMasterModel: typeof BpjsKetenagakerjaanMaster,
    private readonly effectiveRangePayslipChecker: EffectiveRangePayslipChecker,
  ) {}

  // Admin view: every row, active or not (this table intentionally keeps the
  // old + new JP-cap rows side by side, so date-filtering here would hide one).
  list(): Promise<BpjsKetenagakerjaanMaster[]> {
    return this.bpjsKetenagakerjaanMasterModel.findAll();
  }

  // Payroll-facing: the single rate card active for `periodDate`.
  async resolveEffective(
    periodDate: string,
  ): Promise<BpjsKetenagakerjaanMaster> {
    const record = await resolveEffectiveRecord(
      this.bpjsKetenagakerjaanMasterModel,
      periodDate,
    );
    if (!record) {
      throw new NotFoundException(
        `No BPJS Ketenagakerjaan rate card configured effective on ${periodDate}`,
      );
    }
    return record;
  }

  async findByIdOrThrow(id: string): Promise<BpjsKetenagakerjaanMaster> {
    const record = await this.bpjsKetenagakerjaanMasterModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(
        `BPJS Ketenagakerjaan master ${id} not found`,
      );
    }
    return record;
  }

  // §11 audit follow-up — auto-closes whatever row is still open
  // (effectiveEndDate IS NULL) the day before this new row starts. No
  // category dimension here (one rate card applies to everyone per period),
  // so the "same category" filter is simply "no filter at all". (This is
  // independent of list()'s "old + new side by side" comment above — that's
  // about NOT date-filtering the admin view; closeOverlappingPredecessor only
  // ever touches a row that is currently open-ended, never an already-closed
  // historical one.)
  create(
    dto: CreateBpjsKetenagakerjaanMasterDto,
    createdBy: string,
  ): Promise<BpjsKetenagakerjaanMaster> {
    return this.sequelize.transaction(async (transaction) => {
      await closeOverlappingPredecessor(
        this.bpjsKetenagakerjaanMasterModel,
        {},
        dto.effectiveStartDate,
        transaction,
      );
      return this.bpjsKetenagakerjaanMasterModel.create(
        { ...dto, createdBy } as any,
        { transaction },
      );
    });
  }

  // §11/P8-T07-style audit fix — bpjsEmployeeRates/bpjsCompanyRates resolve
  // this row by periodDate alone (no per-employee category), so any payslip
  // in a covered period is enough to lock it.
  async update(
    id: string,
    dto: UpdateBpjsKetenagakerjaanMasterDto,
  ): Promise<BpjsKetenagakerjaanMaster> {
    const record = await this.findByIdOrThrow(id);
    await this.assertLockedFieldsUntouched(record, dto);
    return record.update(dto);
  }

  // effectiveEndDate is deliberately NOT locked (audit follow-up): closing a
  // row's range off doesn't change any historical calculation, so a
  // "referenced" row must stay closeable — see closeOverlappingPredecessor.
  private async assertLockedFieldsUntouched(
    record: BpjsKetenagakerjaanMaster,
    dto: UpdateBpjsKetenagakerjaanMasterDto,
  ): Promise<void> {
    const lockedFields: Array<keyof UpdateBpjsKetenagakerjaanMasterDto> = [
      'jhtEmployeeRate',
      'jhtCompanyRate',
      'jpEmployeeRate',
      'jpCompanyRate',
      'jpWageCap',
      'jkkCompanyRate',
      'jkmCompanyRate',
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
        `BPJS Ketenagakerjaan master ${record.id}'s ${touched} is locked — a ` +
          `payslip already exists for a period this row covers (§11/P8-T07); ` +
          `retire it via effectiveEndDate and add a new row instead of ` +
          `editing this one`,
      );
    }
  }
}
