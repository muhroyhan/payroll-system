import { PartialType } from '@nestjs/mapped-types';
import { CreateLeavePolicyMasterDto } from './create-leave-policy-master.dto';

export class UpdateLeavePolicyMasterDto extends PartialType(
  CreateLeavePolicyMasterDto,
) {}
