import { IsBoolean, IsEnum, IsString, MinLength } from 'class-validator';
import { PayslipComponentType } from '@payroll-system/shared-types';

export class CreatePayslipComponentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(PayslipComponentType)
  componentType: PayslipComponentType;

  @IsBoolean()
  isTaxable: boolean;
}
