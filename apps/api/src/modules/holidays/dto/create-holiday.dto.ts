import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

// Manual creation always yields source = 'manual' (set in the service), so the
// DTO doesn't accept source — users can't forge a google_calendar row.
export class CreateHolidayDto {
  @IsDateString()
  date: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
