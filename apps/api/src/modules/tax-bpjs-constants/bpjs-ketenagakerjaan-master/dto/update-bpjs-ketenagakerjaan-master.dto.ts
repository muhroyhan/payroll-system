import { PartialType } from '@nestjs/mapped-types';
import { CreateBpjsKetenagakerjaanMasterDto } from './create-bpjs-ketenagakerjaan-master.dto';

export class UpdateBpjsKetenagakerjaanMasterDto extends PartialType(
  CreateBpjsKetenagakerjaanMasterDto,
) {}
