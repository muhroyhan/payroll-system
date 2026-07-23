import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class ResolveLeaveBalanceDto {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  leaveTypeId: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;
}
