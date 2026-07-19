import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '@payroll-system/shared-types';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Role)
  role: Role;
}
