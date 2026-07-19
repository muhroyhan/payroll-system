import { IsDateString, IsNumberString, IsOptional } from 'class-validator';

export class CreateBpjsKesehatanMasterDto {
  @IsNumberString()
  employeeRate: string;

  @IsNumberString()
  companyRate: string;

  @IsNumberString()
  wageCap: string;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;
}
