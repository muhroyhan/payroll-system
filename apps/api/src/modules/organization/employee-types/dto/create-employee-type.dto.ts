import { IsString, MinLength } from 'class-validator';

export class CreateEmployeeTypeDto {
  @IsString()
  @MinLength(1)
  name: string;
}
