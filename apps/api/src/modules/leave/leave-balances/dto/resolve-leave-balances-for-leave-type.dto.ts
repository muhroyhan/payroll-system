import { IsInt, IsUUID, Max, Min } from 'class-validator';

// Bulk variant: resolve every active employee's balance for one leave type +
// year in a single call — the year-start initialization workflow (§5.4).
export class ResolveLeaveBalancesForLeaveTypeDto {
  @IsUUID()
  leaveTypeId: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;
}
