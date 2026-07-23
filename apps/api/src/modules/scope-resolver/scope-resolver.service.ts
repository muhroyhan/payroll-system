import { Injectable } from '@nestjs/common';
import { Model, ModelStatic, Op, WhereOptions } from 'sequelize';
import { resolveEffectiveRecords } from '../../common/effective-dating/resolve-effective';
import { resolveScopeFromRows } from './scope-selection';
import {
  ScopeContext,
  ScopedEffectiveRecord,
  ScopeResolution,
  scopeCandidatePairs,
} from './scope-resolver.types';

// §5.2 — the single, shared scope-resolution engine. Salary, Incentive, Leave
// Policy, and Temp Components all call into THIS; never a second implementation.
@Injectable()
export class ScopeResolverService {
  /**
   * Resolve the value that applies to `context`'s employee for `periodDate`
   * from an effective-dated, scoped master table.
   *
   * @param extraWhere further narrows the table before scope matching — e.g.
   *   leave_policy_master must be resolved per leave_type_id.
   */
  async resolve<M extends Model & ScopedEffectiveRecord>(
    model: ModelStatic<M>,
    context: ScopeContext,
    periodDate: string,
    extraWhere: WhereOptions = {},
  ): Promise<ScopeResolution<M>> {
    const pairs = scopeCandidatePairs(context);
    const scopeOr: WhereOptions = {
      [Op.or]: pairs.map((p) => ({
        scopeType: p.scopeType,
        scopeValue: p.scopeValue,
      })),
    };

    // SQL prefilters to effective + candidate scope pairs; the pure selector
    // then applies priority (and re-checks effectiveness, harmlessly).
    const rows = await resolveEffectiveRecords(model, periodDate, {
      [Op.and]: [extraWhere, scopeOr],
    });

    return resolveScopeFromRows(rows, context, periodDate);
  }
}
