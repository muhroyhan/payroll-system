import { PartialType } from '@nestjs/mapped-types';
import { CreateIncentiveMasterDto } from './create-incentive-master.dto';

export class UpdateIncentiveMasterDto extends PartialType(
  CreateIncentiveMasterDto,
) {}
