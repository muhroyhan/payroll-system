import {
  Body,
  Controller,
  Delete,
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
import { ResolveScopeQueryDto } from '../scope-resolver/dto/resolve-scope-query.dto';
import { PayslipTempComponentsService } from './payslip-temp-components.service';
import { CreatePayslipTempComponentDto } from './dto/create-payslip-temp-component.dto';
import { UpdatePayslipTempComponentDto } from './dto/update-payslip-temp-component.dto';

@Controller('payslip-temp-components')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class PayslipTempComponentsController {
  constructor(
    private readonly tempComponentsService: PayslipTempComponentsService,
  ) {}

  @Get()
  list() {
    return this.tempComponentsService.list();
  }

  @Get('active')
  listActiveForEmployee(@Query() query: ResolveScopeQueryDto) {
    return this.tempComponentsService.listActiveForEmployee(
      query.employeeId,
      asOfOrToday(query.asOf),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tempComponentsService.findByIdOrThrow(id);
  }

  @Post()
  create(
    @Body() dto: CreatePayslipTempComponentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tempComponentsService.create(dto, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePayslipTempComponentDto) {
    return this.tempComponentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tempComponentsService.remove(id);
  }
}
