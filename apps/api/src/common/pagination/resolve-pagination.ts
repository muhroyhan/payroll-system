import type { Order } from 'sequelize';
import type { PaginationQueryDto } from './pagination-query.dto';

export interface ResolvedPagination {
  // Present only when the caller actually asked to paginate (`page` or
  // `limit` given) — undefined for the "give me everything" callers
  // (dropdown/Select data sources) so findAll() runs unpaginated, same
  // response shape as before this DTO existed.
  limit?: number;
  offset?: number;
  order: Order;
}

// BUGS#2/#3 — shared page/limit/sort resolution so every migrated list()
// applies the same rule instead of reinventing it: default sort is
// updatedAt DESC (BUGS#3) unless the caller specifies sortBy/sortOrder;
// pagination only kicks in when the caller actually passes page or limit.
export function resolvePaginationAndSort(
  query: PaginationQueryDto,
  defaultSortBy = 'updatedAt',
): ResolvedPagination {
  const order: Order = [[query.sortBy ?? defaultSortBy, query.sortOrder ?? 'DESC']];
  if (query.page === undefined && query.limit === undefined) {
    return { order };
  }
  const limit = query.limit ?? 20;
  const page = query.page ?? 1;
  return { limit, offset: (page - 1) * limit, order };
}
