import { PartialType } from '@nestjs/mapped-types';
import { CreateOvertimeLetterDto } from './create-overtime-letter.dto';

export class UpdateOvertimeLetterDto extends PartialType(
  CreateOvertimeLetterDto,
) {}
