import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// BUGS#2/#3 — the one pagination/sort query-param shape every migrated
// list() extends with its own filter fields. `page`/`limit` are BOTH
// optional and go together deliberately: a caller that omits both (every
// dropdown/Select that wants "just give me everything", e.g.
// useEmployeesQuery()) gets the old unpaginated array back unchanged — see
// resolvePaginationAndSort()'s doc comment. Only a caller that actually
// wants a page gets one.
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
