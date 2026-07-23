import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ResolveLeavePolicyQueryDto {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  leaveTypeId: string;

  @IsOptional()
  @IsDateString()
  asOf?: string;
}
