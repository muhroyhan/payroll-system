import {
  IsDateString,
  IsNumberString,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateOvertimeLetterDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsNumberString()
  plannedOvertimeHours: string;

  @IsNumberString()
  actualOvertimeHours: string;

  @IsString()
  @MinLength(1)
  reason: string;
}
