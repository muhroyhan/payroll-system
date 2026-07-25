import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PayslipsService } from './payslips.service';

// §5.8 — payslips are CRU only (never delete). Read surface here; the full
// summary report is P8-T06.
@Controller('payslips')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class PayslipsController {
  constructor(private readonly payslipsService: PayslipsService) {}

  @Get()
  list(@Query('payrollRunId') payrollRunId?: string) {
    return this.payslipsService.list(payrollRunId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payslipsService.findByIdOrThrow(id);
  }
}
