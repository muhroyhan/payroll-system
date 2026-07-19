import { IsInt, Max, Min } from 'class-validator';

export class UpsertSalaryPeriodConfigDto {
  @IsInt()
  @Min(1)
  @Max(31)
  attendanceCutoffDay: number;

  @IsInt()
  @Min(1)
  @Max(31)
  payrollDisbursementDay: number;
}
