import { PartialType } from '@nestjs/mapped-types';
import { CreateTerBracketMasterDto } from './create-ter-bracket-master.dto';

export class UpdateTerBracketMasterDto extends PartialType(
  CreateTerBracketMasterDto,
) {}
