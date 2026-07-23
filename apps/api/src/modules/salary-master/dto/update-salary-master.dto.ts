import { PartialType } from '@nestjs/mapped-types';
import { CreateSalaryMasterDto } from './create-salary-master.dto';

// scopeType/scopeValue stay editable only while the rule hasn't been consumed
// by a payslip (that immutability guard lands in Phase 8); Phase 2 keeps CRUD open.
export class UpdateSalaryMasterDto extends PartialType(CreateSalaryMasterDto) {}
