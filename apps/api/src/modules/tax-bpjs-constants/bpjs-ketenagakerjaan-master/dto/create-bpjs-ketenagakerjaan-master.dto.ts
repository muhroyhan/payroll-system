import { IsDateString, IsNumberString, IsOptional } from 'class-validator';

export class CreateBpjsKetenagakerjaanMasterDto {
  @IsNumberString()
  jhtEmployeeRate: string;

  @IsNumberString()
  jhtCompanyRate: string;

  @IsNumberString()
  jpEmployeeRate: string;

  @IsNumberString()
  jpCompanyRate: string;

  @IsNumberString()
  jpWageCap: string;

  @IsNumberString()
  jkkCompanyRate: string;

  @IsNumberString()
  jkmCompanyRate: string;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;
}
