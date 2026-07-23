import { PartialType } from '@nestjs/mapped-types';
import { CreateLeaveRequestDto } from './create-leave-request.dto';

// Only reachable while status = pending — the service enforces that, not the DTO.
export class UpdateLeaveRequestDto extends PartialType(CreateLeaveRequestDto) {}
