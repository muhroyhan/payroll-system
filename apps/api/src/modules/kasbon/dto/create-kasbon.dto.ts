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

  // BUGS#20 — no longer client-supplied. KasbonService computes it as
  // floor(amount / installmentCount); the rounding remainder is absorbed by
  // the LAST installment at deduction time (deductInstallment), not stored
  // as a separate value here.
}
