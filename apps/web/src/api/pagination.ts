// BUGS#2 — mirrors apps/api/src/common/pagination/pagination-query.dto.ts's
// PaginatedResult<T>. The one shape every server-paginated list query
// returns; feature api.ts files import this instead of redeclaring it.
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
