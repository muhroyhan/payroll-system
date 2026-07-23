import { Model, ModelStatic, Op, WhereOptions } from 'sequelize';

// Shared effective-dating semantics for every effective-dated table (§7 tax/BPJS
// constants, §5.2 scope masters). One definition of "active for a period" so the
// tax-constant lookups and the scope resolver can never drift apart.

export interface EffectiveDatedFields {
  effectiveStartDate: string; // 'YYYY-MM-DD' (DATEONLY)
  effectiveEndDate: string | null; // null = still active
}

/**
 * A record applies to `periodDate` when it started on/before that date and
 * either has no end date or ends on/after it. Pure predicate — deliberately
 * mirrors {@link effectiveWhere} so the in-memory and SQL paths always agree.
 * DATEONLY values are 'YYYY-MM-DD' strings; lexicographic compare == chronological.
 */
export function isEffectiveOn(
  record: EffectiveDatedFields,
  periodDate: string,
): boolean {
  if (record.effectiveStartDate > periodDate) {
    return false;
  }
  if (
    record.effectiveEndDate !== null &&
    record.effectiveEndDate < periodDate
  ) {
    return false;
  }
  return true;
}

/** The SQL counterpart of {@link isEffectiveOn}, as a composable WHERE fragment. */
export function effectiveWhere(periodDate: string): WhereOptions {
  return {
    [Op.and]: [
      { effectiveStartDate: { [Op.lte]: periodDate } },
      {
        [Op.or]: [
          { effectiveEndDate: { [Op.is]: null } },
          { effectiveEndDate: { [Op.gte]: periodDate } },
        ],
      },
    ],
  };
}

/**
 * Defensive tiebreak: if several rows are effective for the same period
 * (overlapping ranges — a data-quality problem), the one that took effect most
 * recently wins — never "whatever row was inserted last". Encodes TC-SCOPE-06's
 * intent ("active for the queried period, not just the most recently created").
 */
export function pickLatestEffective<M extends EffectiveDatedFields>(
  rows: M[],
): M | null {
  if (rows.length === 0) {
    return null;
  }
  return rows.reduce((best, cur) =>
    cur.effectiveStartDate > best.effectiveStartDate ? cur : best,
  );
}

/** All rows active for `periodDate`, optionally narrowed by `extraWhere`. */
export function resolveEffectiveRecords<M extends Model>(
  model: ModelStatic<M>,
  periodDate: string,
  extraWhere: WhereOptions = {},
): Promise<M[]> {
  return model.findAll({
    where: { [Op.and]: [extraWhere, effectiveWhere(periodDate)] },
  });
}

/** The single row active for `periodDate` (latest-effective wins on overlap), or null. */
export async function resolveEffectiveRecord<
  M extends Model & EffectiveDatedFields,
>(
  model: ModelStatic<M>,
  periodDate: string,
  extraWhere: WhereOptions = {},
): Promise<M | null> {
  const rows = await resolveEffectiveRecords(model, periodDate, extraWhere);
  return pickLatestEffective(rows);
}
