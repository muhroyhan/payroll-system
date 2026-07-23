import { PartialType } from '@nestjs/mapped-types';
import { CreateSuratPeringatanDto } from './create-surat-peringatan.dto';

export class UpdateSuratPeringatanDto extends PartialType(
  CreateSuratPeringatanDto,
) {}
