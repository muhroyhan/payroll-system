import { IsInt, Min } from 'class-validator';

// Only quota is editable through this route — `used` only ever moves via the
// leave_requests approval workflow (§11), never a direct edit.
export class UpdateLeaveBalanceQuotaDto {
  @IsInt()
  @Min(0)
  quota: number;
}
