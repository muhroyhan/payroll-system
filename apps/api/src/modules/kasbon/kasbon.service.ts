import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction, UniqueConstraintError } from 'sequelize';
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
  create(dto: CreateKasbonDto, createdBy: string): Promise<Kasbon> {
    return this.kasbonModel.create({
      ...dto,
      status: KasbonStatus.PENDING,
      remainingBalance: null,
      createdBy,
    } as any);
  }

  // §11/TC-KASBON-04 locks only amount/installment_count/installment_amount
  // once a deduction has started — NOT the whole record. requestDate (the
  // only other user-editable field right now) stays editable throughout.
  async update(id: string, dto: UpdateKasbonDto): Promise<Kasbon> {
    const record = await this.findByIdOrThrow(id);
    this.assertNotDeadEnd(record);
    this.assertLockedFieldsUntouched(record, dto);
    const patch: Record<string, unknown> = { ...dto };
    // KASBON-005 — approved-but-no-deduction-yet is still fully editable
    // (assertLockedFieldsUntouched above is a no-op in that case), so a new
    // amount must carry remainingBalance along with it; otherwise the old
    // amount's remainingBalance (set once, at approve()) is left behind,
    // making the kasbon look partially paid off and wrongly locking it on
    // the very next edit.
    if (dto.amount !== undefined && record.remainingBalance !== null) {
      patch.remainingBalance = dto.amount;
    }
    return record.update(patch);
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

  async reject(
    id: string,
    rejectedBy: string,
    rejectReason: string,
  ): Promise<Kasbon> {
    const record = await this.assertPending(id);
    return record.update({
      status: KasbonStatus.REJECTED,
      rejectedBy,
      rejectReason,
    });
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

  // P8-T07 — undo every installment this payroll run drew, when the run is
  // reverted to draft. A deduction is only ever provisional while the run is
  // `calculated` (revert is impossible once approved/disbursed, TC-PAYROLL-05),
  // so reversing here never touches a truly-disbursed payment. Restores
  // remaining_balance and un-pays-off a kasbon the deleted deduction had
  // settled — keeping remaining_balance an accurate reflection of only the
  // installments still backed by a live payslip. Runs inside the caller's
  // revert transaction so the whole teardown is atomic.
  async reverseInstallmentsForRun(
    payrollRunId: string,
    transaction: Transaction,
  ): Promise<number> {
    const deductions = await this.kasbonDeductionModel.findAll({
      where: { payrollRunId },
      transaction,
    });
    return this.restoreDeductions(deductions, transaction);
  }

  // Task B — narrower than reverseInstallmentsForRun above: undoes ONLY the
  // deductions belonging to ONE employee's kasbons within ONE run, for when
  // that single employee is excluded from the run (negative net pay) rather
  // than the whole run being reverted.
  //
  // This is a REQUIRED explicit call, not automatic: deductInstallment's
  // writes (above) are never passed a `transaction` — they commit
  // immediately, independent of whatever the payroll calculation service
  // does afterward in ITS OWN transaction. Throwing inside that transaction
  // rolls back the (never-attempted) payslip/line-item inserts, but does
  // NOTHING to a kasbon deduction that already committed moments earlier —
  // exactly why PayrollRunRevertService needs its own explicit
  // reverseInstallmentsForRun call for the whole-run case instead of relying
  // on any transaction to do it. This method is that same compensating
  // action, scoped to one employee.
  async reverseInstallmentsForEmployeeInRun(
    employeeId: string,
    payrollRunId: string,
  ): Promise<number> {
    const kasbons = await this.kasbonModel.findAll({
      where: { employeeId },
      attributes: ['id'],
    });
    const kasbonIds = kasbons.map((k) => k.id);
    if (kasbonIds.length === 0) {
      return 0;
    }
    const deductions = await this.kasbonDeductionModel.findAll({
      where: { kasbonId: { [Op.in]: kasbonIds }, payrollRunId },
    });
    return this.restoreDeductions(deductions);
  }

  private async restoreDeductions(
    deductions: KasbonDeduction[],
    transaction?: Transaction,
  ): Promise<number> {
    for (const deduction of deductions) {
      const kasbon = await this.kasbonModel.findByPk(deduction.kasbonId, {
        transaction,
      });
      if (kasbon) {
        const current = Number(kasbon.remainingBalance ?? kasbon.amount);
        const restored = current + Number(deduction.amount);
        await kasbon.update(
          {
            remainingBalance: restored.toFixed(2),
            status:
              kasbon.status === KasbonStatus.PAID_OFF
                ? KasbonStatus.APPROVED
                : kasbon.status,
          },
          { transaction },
        );
      }
      await deduction.destroy({ transaction });
    }
    return deductions.length;
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
