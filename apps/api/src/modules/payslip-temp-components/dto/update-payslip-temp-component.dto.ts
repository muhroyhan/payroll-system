import { PartialType } from '@nestjs/mapped-types';
import { CreatePayslipTempComponentDto } from './create-payslip-temp-component.dto';

export class UpdatePayslipTempComponentDto extends PartialType(
  CreatePayslipTempComponentDto,
) {}
