import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PayslipComponentsService } from './payslip-components.service';
import { CreatePayslipComponentDto } from './dto/create-payslip-component.dto';
import { UpdatePayslipComponentDto } from './dto/update-payslip-component.dto';

@Controller('payslip-components')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PayslipComponentsController {
  constructor(
    private readonly payslipComponentsService: PayslipComponentsService,
  ) {}

  @Get()
  list() {
    return this.payslipComponentsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payslipComponentsService.findByIdOrThrow(id);
  }

  @Post()
  create(@Body() dto: CreatePayslipComponentDto) {
    return this.payslipComponentsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePayslipComponentDto) {
    return this.payslipComponentsService.update(id, dto);
  }
}
