import { PartialType } from '@nestjs/mapped-types';
import { CreateSuratIjinDto } from './create-surat-ijin.dto';

// Only reachable while status = pending — the service enforces that (§11).
export class UpdateSuratIjinDto extends PartialType(CreateSuratIjinDto) {}
