import { PartialType } from '@nestjs/mapped-types';
import { CreatePtkpMasterDto } from './create-ptkp-master.dto';

export class UpdatePtkpMasterDto extends PartialType(CreatePtkpMasterDto) {}
