import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // Dedicated action routes (deactivate/reactivate) rather than a generic
  // PATCH :id + { isActive: boolean } body — matches this codebase's existing
  // convention for state-transition endpoints (payroll-runs' approve/
  // disburse/revert, kasbon's approve/reject, leave-requests' approve/reject:
  // all dedicated verb routes, never a generic status-field PATCH). Keeps the
  // intent self-evident from the URL and the audit-log-worthy action explicit,
  // rather than one endpoint that could silently flip either direction.
  // @Roles(Role.ADMIN) repeated here even though the class-level decorator
  // already covers it — this is the specific endpoint the audit finding named,
  // so the restriction is explicit at the point of reading this method.
  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.usersService.setActive(id, false);
  }

  @Patch(':id/reactivate')
  @Roles(Role.ADMIN)
  reactivate(@Param('id') id: string) {
    return this.usersService.setActive(id, true);
  }
}
