import { PartialType } from '@nestjs/mapped-types';
import { CreatePayslipComponentDto } from './create-payslip-component.dto';

export class UpdatePayslipComponentDto extends PartialType(
  CreatePayslipComponentDto,
) {}
