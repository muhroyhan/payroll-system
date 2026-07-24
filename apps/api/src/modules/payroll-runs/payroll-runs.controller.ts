import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PayrollRunsService } from './payroll-runs.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';

@Controller('payroll-runs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class PayrollRunsController {
  constructor(private readonly payrollRunsService: PayrollRunsService) {}

  @Get()
  list() {
    return this.payrollRunsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payrollRunsService.findByIdOrThrow(id);
  }

  @Post()
  create(
    @Body() dto: CreatePayrollRunDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payrollRunsService.create(dto, user.id);
  }

  // P8-T02 — enqueue the calculation job and return immediately (202). The run
  // stays `draft` until the job finishes and flips it to `calculated`; poll
  // GET /:id for processed_count/total_count progress.
  @Post(':id/calculate')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(Role.ADMIN)
  calculate(@Param('id') id: string) {
    return this.payrollRunsService.requestCalculation(id);
  }

  // The money-committing lifecycle steps are ADMIN-only (calculation itself is
  // the P8-T02 job, not an endpoint here).
  @Put(':id/approve')
  @Roles(Role.ADMIN)
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.payrollRunsService.approve(id, user.id);
  }

  @Put(':id/disburse')
  @Roles(Role.ADMIN)
  disburse(@Param('id') id: string) {
    return this.payrollRunsService.disburse(id);
  }

  @Put(':id/revert')
  @Roles(Role.ADMIN)
  revert(@Param('id') id: string) {
    return this.payrollRunsService.revertToDraft(id);
  }
}
