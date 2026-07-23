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
import { LeaveBalancesService } from './leave-balances.service';
import { ResolveLeaveBalanceDto } from './dto/resolve-leave-balance.dto';
import { ResolveLeaveBalancesForLeaveTypeDto } from './dto/resolve-leave-balances-for-leave-type.dto';
import { UpdateLeaveBalanceQuotaDto } from './dto/update-leave-balance-quota.dto';

@Controller('leave-balances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class LeaveBalancesController {
  constructor(private readonly leaveBalancesService: LeaveBalancesService) {}

  @Get()
  list(@Query('employeeId') employeeId?: string, @Query('year') year?: string) {
    return this.leaveBalancesService.list(
      employeeId,
      year ? Number(year) : undefined,
    );
  }

  @Post('resolve')
  resolveOne(@Body() dto: ResolveLeaveBalanceDto) {
    return this.leaveBalancesService.resolveOne(
      dto.employeeId,
      dto.leaveTypeId,
      dto.year,
    );
  }

  @Post('resolve-for-leave-type')
  resolveForLeaveType(@Body() dto: ResolveLeaveBalancesForLeaveTypeDto) {
    return this.leaveBalancesService.resolveForLeaveType(
      dto.leaveTypeId,
      dto.year,
    );
  }

  @Put(':id/quota')
  updateQuota(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveBalanceQuotaDto,
  ) {
    return this.leaveBalancesService.updateQuota(id, dto);
  }
}
