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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { asOfOrToday } from '../../common/effective-dating/as-of-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { SalaryMasterService } from './salary-master.service';
import { CreateSalaryMasterDto } from './dto/create-salary-master.dto';
import { UpdateSalaryMasterDto } from './dto/update-salary-master.dto';
import { ResolveScopeQueryDto } from '../scope-resolver/dto/resolve-scope-query.dto';

@Controller('salary-master')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class SalaryMasterController {
  constructor(private readonly salaryMasterService: SalaryMasterService) {}

  @Get()
  list() {
    return this.salaryMasterService.list();
  }

  // Resolve the base salary for ?employeeId= as of ?asOf=YYYY-MM-DD (default today).
  @Get('resolve')
  resolve(@Query() query: ResolveScopeQueryDto) {
    return this.salaryMasterService.resolveForEmployee(
      query.employeeId,
      asOfOrToday(query.asOf),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salaryMasterService.findByIdOrThrow(id);
  }

  @Post()
  create(
    @Body() dto: CreateSalaryMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salaryMasterService.create(dto, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSalaryMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salaryMasterService.update(id, dto, user.id);
  }
}
