import { IsDateString, IsUUID } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  leaveTypeId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
