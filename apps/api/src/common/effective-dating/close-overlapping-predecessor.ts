import { ConflictException } from '@nestjs/common';
import { Model, ModelStatic, Op, Transaction, WhereOptions } from 'sequelize';
import { EffectiveDatedFields } from './resolve-effective';

// §11 audit follow-up — closes the overlap gap found while auditing
// EffectiveRangePayslipChecker's reasoning: two same-category effective-dated
// rows both left open-ended (the older one never got its effectiveEndDate
// set when the newer one was created) makes the checker over-lock the older,
// already-superseded row, because it only checks range membership, not which
// row a real resolve would actually have picked (pickLatestEffective).
//
// Fixed at the source instead: before a new row is inserted, close off
// whichever existing row in the same category is still open
// (effectiveEndDate IS NULL), so at most one row per category is ever open
// at a time and the overlap this whole audit trail is about can no longer be
// created going forward. Deliberately does NOT guess when the existing data
// doesn't cleanly support an unambiguous "this row supersedes that one":
//  - more than one open predecessor already exists (pre-existing dirty data —
//    which one should close is not this function's call to make), or
//  - the new row's effectiveStartDate is on/before the predecessor's own
//    effectiveStartDate (closing it would produce an inverted or zero-length
//    range on the predecessor, or the "new" row isn't actually later at all).
// Both throw instead of silently picking a resolution.
export async function closeOverlappingPredecessor<
  M extends Model & EffectiveDatedFields & { id: string },
>(
  model: ModelStatic<M>,
  sameCategoryWhere: WhereOptions,
  newEffectiveStartDate: string,
  transaction: Transaction,
): Promise<void> {
  const openPredecessors = await model.findAll({
    where: {
      ...sameCategoryWhere,
      effectiveEndDate: { [Op.is]: null },
    } as WhereOptions,
    transaction,
  });

  if (openPredecessors.length === 0) {
    return;
  }
  if (openPredecessors.length > 1) {
    throw new ConflictException(
      `${openPredecessors.length} existing rows in this category are already ` +
        `open-ended (effectiveEndDate is null) — this is pre-existing ` +
        `overlapping data that predates this guard; close all but one ` +
        `manually before adding a new row`,
    );
  }

  const [predecessor] = openPredecessors;
  if (newEffectiveStartDate <= predecessor.effectiveStartDate) {
    throw new ConflictException(
      `Cannot add a row effective from ${newEffectiveStartDate} — an existing ` +
        `row in this category (id=${predecessor.id}) is already open-ended, ` +
        `starting ${predecessor.effectiveStartDate}; the new row's ` +
        `effectiveStartDate must be strictly after that`,
    );
  }

  const closeDate = new Date(`${newEffectiveStartDate}T00:00:00Z`);
  closeDate.setUTCDate(closeDate.getUTCDate() - 1);
  await predecessor.update(
    { effectiveEndDate: closeDate.toISOString().slice(0, 10) },
    { transaction },
  );
}
