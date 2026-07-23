import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateFingerprintDto {
  @IsUUID()
  employeeId: string;

  @IsString()
  @MinLength(1)
  deviceUserId: string;

  @IsString()
  @MinLength(1)
  deviceId: string;

  @IsOptional()
  @IsDateString()
  enrolledAt?: string;
}
