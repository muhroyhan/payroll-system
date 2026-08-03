import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { EmployeeActiveStatus } from '@payroll-system/shared-types';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

// BUGS#2 — GET /employees' filters, moved server-side from
// EmployeeListPage.tsx's client-side .filter() over the whole cached list.
export class EmployeeListQueryDto extends PaginationQueryDto {
  // BUGS#9/#10 — server-side name/NIK search for the debounced employee
  // picker (EmployeeSelect), replacing a client-side filter over every
  // employee ever fetched.
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EmployeeActiveStatus)
  status?: EmployeeActiveStatus;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  divisionId?: string;

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsUUID()
  employeeTypeId?: string;
}
