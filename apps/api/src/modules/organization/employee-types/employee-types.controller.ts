import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { EmployeeTypesService } from './employee-types.service';
import { CreateEmployeeTypeDto } from './dto/create-employee-type.dto';

@Controller('employee-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class EmployeeTypesController {
  constructor(private readonly employeeTypesService: EmployeeTypesService) {}

  @Get()
  list() {
    return this.employeeTypesService.list();
  }

  @Post()
  create(@Body() dto: CreateEmployeeTypeDto) {
    return this.employeeTypesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateEmployeeTypeDto) {
    return this.employeeTypesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeeTypesService.remove(id);
  }
}
