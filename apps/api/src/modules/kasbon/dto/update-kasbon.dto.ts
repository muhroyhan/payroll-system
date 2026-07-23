import { PartialType } from '@nestjs/mapped-types';
import { CreateKasbonDto } from './create-kasbon.dto';

export class UpdateKasbonDto extends PartialType(CreateKasbonDto) {}
