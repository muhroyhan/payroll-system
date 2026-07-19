import { PartialType } from '@nestjs/mapped-types';
import { CreateBpjsKesehatanMasterDto } from './create-bpjs-kesehatan-master.dto';

export class UpdateBpjsKesehatanMasterDto extends PartialType(
  CreateBpjsKesehatanMasterDto,
) {}
