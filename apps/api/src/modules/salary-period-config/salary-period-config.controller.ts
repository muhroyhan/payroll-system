import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { SalaryPeriodConfigService } from './salary-period-config.service';
import { UpsertSalaryPeriodConfigDto } from './dto/upsert-salary-period-config.dto';

@Controller('salary-period-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalaryPeriodConfigController {
  constructor(
    private readonly salaryPeriodConfigService: SalaryPeriodConfigService,
  ) {}

  @Get()
  get() {
    return this.salaryPeriodConfigService.get();
  }

  @Put()
  @Roles(Role.ADMIN)
  upsert(
    @Body() dto: UpsertSalaryPeriodConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salaryPeriodConfigService.upsert(dto, user.id);
  }
}
