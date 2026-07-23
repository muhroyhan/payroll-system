import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { KasbonStatus } from '@payroll-system/shared-types';
import { assertPendingStatus } from '../../common/approval-workflow/assert-pending';
import { Kasbon } from './entities/kasbon.entity';
import { KasbonDeduction } from './entities/kasbon-deduction.entity';
import { CreateKasbonDto } from './dto/create-kasbon.dto';
import { UpdateKasbonDto } from './dto/update-kasbon.dto';

@Injectable()
export class KasbonService {
  constructor(
    @InjectModel(Kasbon)
    private readonly kasbonModel: typeof Kasbon,
    @InjectModel(KasbonDeduction)
    private readonly kasbonDeductionModel: typeof KasbonDeduction,
  ) {}

  list(employeeId?: string): Promise<Kasbon[]> {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    return this.kasbonModel.findAll({ where, include: ['employee'] });
  }

  async findByIdOrThrow(id: string): Promise<Kasbon> {
    const record = await this.kasbonModel.findByPk(id, {
      include: ['employee'],
    });
    if (!record) {
      throw new NotFoundException(`Kasbon ${id} not found`);
    }
    return record;
  }

  // remaining_balance stays null here — amount/installment_count aren't
  // fixed until approve() locks them in.
  create(dto: CreateKasbonDto): Promise<Kasbon> {
    return this.kasbonModel.create({
      ...dto,
      status: KasbonStatus.PENDING,
      remainingBalance: null,
    } as any);
  }

  // §11/TC-KASBON-04 locks only amount/installment_count/installment_amount
  // once a deduction has started — NOT the whole record. requestDate (the
  // only other user-editable field right now) stays editable throughout.
  async update(id: string, dto: UpdateKasbonDto): Promise<Kasbon> {
    const record = await this.findByIdOrThrow(id);
    this.assertNotDeadEnd(record);
    this.assertLockedFieldsUntouched(record, dto);
    return record.update(dto);
  }

  // remove() has no per-field granularity — deleting the row necessarily
  // discards amount/installment_count/installment_amount too, so it stays
  // fully blocked once a deduction has started (on top of the dead-end
  // check). The kasbon_deductions FK (RESTRICT) would reject the delete at
  // the DB level regardless — this just gives a clearer error first.
  async remove(id: string): Promise<void> {
    const record = await this.findByIdOrThrow(id);
    this.assertNotDeadEnd(record);
    if (this.hasDeductionStarted(record)) {
      throw new ConflictException(
        `Kasbon ${id} is locked — at least one installment has already been ` +
          `deducted (§11); cancel future installments and open a new kasbon ` +
          `instead of deleting this one`,
      );
    }
    await record.destroy();
  }

  // Status transition itself follows the standard one-way workflow lock —
  // reused from surat_ijin/overtime_letter (P4-T01/T03): only a pending
  // request can be approved or rejected.
  async approve(id: string, approvedBy: string): Promise<Kasbon> {
    const record = await this.assertPending(id);
    return record.update({
      status: KasbonStatus.APPROVED,
      approvedBy,
      remainingBalance: record.amount,
    });
  }

  async reject(id: string): Promise<Kasbon> {
    const record = await this.assertPending(id);
    return record.update({ status: KasbonStatus.REJECTED });
  }

  // P5-T02 — standalone method; Phase 8's payroll engine calls this once per
  // (kasbon, run) for every active kasbon, per employee, per run. Not wired
  // to a real payroll run yet (doesn't exist until Phase 8) — same
  // prepare-now/wire-later shape as PermissionResolver (P3-T03/P4-T04).
  //
  // Idempotency: a KasbonDeduction row for (kasbonId, payrollRunId) is the
  // guard, enforced by a DB-level unique constraint — not just an app-level
  // "check then act", which would have a race window if the payroll job
  // retries concurrently. The pre-check below avoids the DB round-trip on
  // the common case (row already exists); the catch below is what actually
  // guarantees correctness if two calls race past the pre-check.
  async deductInstallment(
    kasbonId: string,
    payrollRunId: string,
  ): Promise<Kasbon> {
    const record = await this.findByIdOrThrow(kasbonId);

    // TC-KASBON-03 — already fully paid off, no further deduction ever.
    if (record.status === KasbonStatus.PAID_OFF) {
      return record;
    }
    if (record.status !== KasbonStatus.APPROVED) {
      throw new ConflictException(
        `Kasbon ${kasbonId} is not approved — cannot deduct an installment`,
      );
    }

    const alreadyDeducted = await this.kasbonDeductionModel.findOne({
      where: { kasbonId, payrollRunId },
    });
    if (alreadyDeducted) {
      // TC-KASBON-02 — this run already deducted; retry is a no-op.
      return record;
    }

    const remaining = Number(record.remainingBalance);
    const installment = Math.min(Number(record.installmentAmount), remaining);

    try {
      await this.kasbonDeductionModel.create({
        kasbonId,
        payrollRunId,
        amount: installment.toFixed(2),
      } as any);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        // Lost the race to a concurrent call for the same run — that call
        // already recorded the deduction, so this one is a no-op too.
        return this.findByIdOrThrow(kasbonId);
      }
      throw error;
    }

    const newRemaining = remaining - installment;
    const patch: Record<string, unknown> = {
      remainingBalance: newRemaining.toFixed(2),
    };
    if (newRemaining <= 0) {
      patch.status = KasbonStatus.PAID_OFF;
    }
    return record.update(patch);
  }

  private async assertPending(id: string): Promise<Kasbon> {
    const record = await this.findByIdOrThrow(id);
    assertPendingStatus(record.status, KasbonStatus.PENDING, 'Kasbon', id);
    return record;
  }

  // rejected/paid_off are dead ends regardless of which field is touched —
  // no reason to edit either (deliberately NOT the same guard as the
  // deduction-started lock below, which only applies while still approved).
  private assertNotDeadEnd(record: Kasbon): void {
    if (record.status === KasbonStatus.REJECTED) {
      throw new ConflictException(
        `Kasbon ${record.id} is rejected — create a new request instead of editing this one`,
      );
    }
    if (record.status === KasbonStatus.PAID_OFF) {
      throw new ConflictException(
        `Kasbon ${record.id} is already paid off — it is fully settled and locked`,
      );
    }
  }

  private hasDeductionStarted(record: Kasbon): boolean {
    return (
      record.remainingBalance !== null &&
      Number(record.remainingBalance) < Number(record.amount)
    );
  }

  // §11/TC-KASBON-04 — locks ONLY amount/installment_count/
  // installment_amount once at least one installment has been deducted.
  // A kasbon that's been approved but hasn't had any deduction yet is still
  // fully editable (its amount isn't "real" until payroll starts drawing
  // against it) — checked via hasDeductionStarted, not via status alone.
  private assertLockedFieldsUntouched(
    record: Kasbon,
    dto: UpdateKasbonDto,
  ): void {
    if (!this.hasDeductionStarted(record)) {
      return;
    }
    const lockedFields: Array<keyof UpdateKasbonDto> = [
      'amount',
      'installmentCount',
      'installmentAmount',
    ];
    const touched = lockedFields.find((field) => dto[field] !== undefined);
    if (touched) {
      throw new ConflictException(
        `Kasbon ${record.id}'s ${touched} is locked — at least one installment ` +
          `has already been deducted (§11); cancel future installments and ` +
          `open a new kasbon instead of editing this one retroactively`,
      );
    }
  }
}
