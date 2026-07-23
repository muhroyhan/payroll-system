import { IsDateString, IsOptional, IsUUID } from 'class-validator';

// Shared query for every "resolve the value for an employee as of a date"
// endpoint on the scope masters.
export class ResolveScopeQueryDto {
  @IsUUID()
  employeeId: string;

  @IsOptional()
  @IsDateString()
  asOf?: string;
}
