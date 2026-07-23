import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { asOfOrToday } from '../../../common/effective-dating/as-of-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { LeavePolicyMasterService } from './leave-policy-master.service';
import { CreateLeavePolicyMasterDto } from './dto/create-leave-policy-master.dto';
import { UpdateLeavePolicyMasterDto } from './dto/update-leave-policy-master.dto';
import { ResolveLeavePolicyQueryDto } from './dto/resolve-leave-policy-query.dto';

@Controller('leave-policy-master')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class LeavePolicyMasterController {
  constructor(
    private readonly leavePolicyMasterService: LeavePolicyMasterService,
  ) {}

  @Get()
  list() {
    return this.leavePolicyMasterService.list();
  }

  @Get('resolve')
  resolve(@Query() query: ResolveLeavePolicyQueryDto) {
    return this.leavePolicyMasterService.resolveForEmployee(
      query.employeeId,
      query.leaveTypeId,
      asOfOrToday(query.asOf),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leavePolicyMasterService.findByIdOrThrow(id);
  }

  @Post()
  create(
    @Body() dto: CreateLeavePolicyMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leavePolicyMasterService.create(dto, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeavePolicyMasterDto) {
    return this.leavePolicyMasterService.update(id, dto);
  }
}
