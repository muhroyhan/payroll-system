import {
  IsDateString,
  IsInt,
  IsNumberString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateKasbonDto {
  @IsUUID()
  employeeId: string;

  @IsNumberString()
  amount: string;

  @IsDateString()
  requestDate: string;

  @IsInt()
  @Min(1)
  installmentCount: number;

  @IsNumberString()
  installmentAmount: string;
}
