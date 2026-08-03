import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

// BUGS#2 — pagination added alongside the existing employeeId filter.
export class KasbonListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
